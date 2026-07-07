from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from twilio.rest import Client
import mysql.connector
from dotenv import load_dotenv
from functools import wraps
from datetime import date, timedelta
import re
import os
load_dotenv()

app = Flask(__name__)
app.secret_key = "sgt_modulo3"

db_config = {
    'host': os.getenv('DB_HOST'),
    'database': os.getenv('DB_DATABASE'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
}


def get_db_connection():
    return mysql.connector.connect(**db_config)


# ---------------------------------------------------------
# FUNÇÃO AUXILIAR: Sanitização e Formatação E.164
# ---------------------------------------------------------
def formatar_para_twilio(telefone_raw):
    if not telefone_raw:
        return ""
    numeros = re.sub(r'\D', '', str(telefone_raw))
    if len(numeros) in (10, 11):
        return f"+55{numeros}"
    elif len(numeros) in (12, 13):
        return f"+{numeros}"
    return numeros


# =========================================================
# AUTENTICAÇÃO / SESSÃO
# =========================================================

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_type' not in session:
            if request.path.startswith('/api/'):
                return jsonify({"erro": "Não autenticado"}), 401
            return redirect(url_for('login_page'))
        return f(*args, **kwargs)
    return decorated


def adm_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if session.get('user_type') != 'adm':
            if request.path.startswith('/api/'):
                return jsonify({"erro": "Acesso restrito a administradores"}), 403
            return redirect(url_for('index'))
        return f(*args, **kwargs)
    return decorated


@app.route('/login', methods=['GET'])
def login_page():
    if 'user_type' in session:
        return redirect(url_for('index'))
    return render_template('login.html')


@app.route('/api/login', methods=['POST'])
def api_login():
    try:
        dados = request.get_json()
        email = (dados.get('email') or '').strip().lower()
        senha = dados.get('senha') or ''

        if not email or not senha:
            return jsonify({"erro": "Informe e-mail e senha"}), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Tenta primeiro como ADM
        cursor.execute("SELECT * FROM adm WHERE LOWER(EMAIL_ADM) = %s", (email,))
        usuario = cursor.fetchone()
        tipo = 'adm'

        if not usuario:
            cursor.execute("SELECT * FROM funcionarios WHERE LOWER(EMAIL_FUN) = %s", (email,))
            usuario = cursor.fetchone()
            tipo = 'funcionario'

        cursor.close()
        conn.close()

        if not usuario:
            return jsonify({"erro": "E-mail ou senha inválidos"}), 401

        senha_hash = usuario['SENHA_ADM'] if tipo == 'adm' else usuario['SENHA_FUN']

        if not senha_hash:
            return jsonify({"erro": "Este usuário ainda não possui senha cadastrada. Contate o administrador."}), 401

        try:
            senha_valida = check_password_hash(senha_hash, senha)
        except Exception:
            senha_valida = False

        if not senha_valida:
            return jsonify({"erro": "E-mail ou senha inválidos"}), 401

        session['user_type'] = tipo
        session['user_id'] = usuario['ID_ADM'] if tipo == 'adm' else usuario['ID_FUN']
        session['user_name'] = usuario['NOME_ADM'] if tipo == 'adm' else usuario['NOME_FUN']

        return jsonify({
            "mensagem": "Login realizado com sucesso!",
            "tipo": tipo,
            "nome": session['user_name'],
            "redirect": url_for('index')
        }), 200

    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login_page'))


@app.route('/api/me', methods=['GET'])
@login_required
def api_me():
    return jsonify({
        "tipo": session.get('user_type'),
        "id": session.get('user_id'),
        "nome": session.get('user_name')
    }), 200


# =========================================================
# CONFIGURAÇÕES - DADOS DA PRÓPRIA CONTA (ADM ou FUNCIONÁRIO)
# =========================================================

@app.route('/api/minha-conta', methods=['GET'])
@login_required
def obter_minha_conta():
    try:
        tipo = session.get('user_type')
        user_id = session.get('user_id')
        tabela = 'adm' if tipo == 'adm' else 'funcionarios'
        sufixo = 'ADM' if tipo == 'adm' else 'FUN'

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            f"""SELECT ID_{sufixo} AS ID, NOME_{sufixo} AS NOME, EMAIL_{sufixo} AS EMAIL,
                       TELEFONE_{sufixo} AS TELEFONE, WHATSAPP_{sufixo} AS WHATSAPP,
                       CARGO_{sufixo} AS CARGO, SETOR_{sufixo} AS SETOR
                FROM {tabela} WHERE ID_{sufixo} = %s""",
            (user_id,)
        )
        resultado = cursor.fetchone()
        cursor.close()
        conn.close()

        if not resultado:
            return jsonify({"erro": "Usuário não encontrado"}), 404

        resultado['tipo'] = tipo
        return jsonify(resultado), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@app.route('/api/minha-conta', methods=['PUT'])
@login_required
def atualizar_minha_conta():
    conn = None
    try:
        dados = request.get_json(force=True)
        tipo = session.get('user_type')
        user_id = session.get('user_id')
        tabela = 'adm' if tipo == 'adm' else 'funcionarios'
        sufixo = 'ADM' if tipo == 'adm' else 'FUN'

        senha_atual = dados.get('senha_atual') or ''
        if not senha_atual:
            return jsonify({"erro": "Informe sua senha atual para confirmar as alterações"}), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(f"SELECT * FROM {tabela} WHERE ID_{sufixo} = %s", (user_id,))
        existente = cursor.fetchone()

        if not existente:
            cursor.close()
            conn.close()
            return jsonify({"erro": "Usuário não encontrado"}), 404

        senha_hash_atual = existente.get(f'SENHA_{sufixo}')
        try:
            senha_valida = senha_hash_atual and check_password_hash(senha_hash_atual, senha_atual)
        except Exception:
            senha_valida = False

        if not senha_valida:
            cursor.close()
            conn.close()
            return jsonify({"erro": "Senha atual incorreta"}), 401

        senha_nova = dados.get('senha_nova') or ''
        if senha_nova and len(senha_nova) < 6:
            cursor.close()
            conn.close()
            return jsonify({"erro": "A nova senha deve ter pelo menos 6 caracteres"}), 400

        senha_final = generate_password_hash(senha_nova) if senha_nova else senha_hash_atual
        novo_nome = dados.get('nome', existente[f'NOME_{sufixo}'])
        novo_email = (dados.get('email') or existente[f'EMAIL_{sufixo}']).strip().lower()

        cursor.execute(f"""
            UPDATE {tabela}
            SET NOME_{sufixo}=%s, EMAIL_{sufixo}=%s, TELEFONE_{sufixo}=%s, WHATSAPP_{sufixo}=%s, SENHA_{sufixo}=%s
            WHERE ID_{sufixo}=%s
        """, (
            novo_nome,
            novo_email,
            dados.get('telefone', existente[f'TELEFONE_{sufixo}']),
            dados.get('whatsapp', existente[f'WHATSAPP_{sufixo}']),
            senha_final,
            user_id
        ))
        conn.commit()
        cursor.close()
        conn.close()

        session['user_name'] = novo_nome

        return jsonify({"mensagem": "Dados atualizados com sucesso!"}), 200
    except mysql.connector.errors.IntegrityError:
        if conn and conn.is_connected():
            conn.close()
        return jsonify({"erro": "Este e-mail ou telefone já está em uso por outro cadastro."}), 409
    except Exception as e:
        if conn and conn.is_connected():
            conn.close()
        return jsonify({"erro": str(e)}), 500


# =========================================================
# PÁGINAS (RENDERIZAÇÃO)
# =========================================================

@app.route('/')
@login_required
def index():
    return render_template('index.html', tipo=session.get('user_type'), nome=session.get('user_name'), ativo='dashboard')


@app.route('/funcionarios')
@adm_required
def pagina_funcionarios():
    return render_template('funcionarios.html', tipo=session.get('user_type'), nome=session.get('user_name'), ativo='funcionarios')


@app.route('/treinamentos')
@login_required
def pagina_treinamentos():
    return render_template('treinamentos.html', tipo=session.get('user_type'), nome=session.get('user_name'), ativo='treinamentos')


@app.route('/relatorios')
@adm_required
def pagina_relatorios():
    return render_template('relatorios.html', tipo=session.get('user_type'), nome=session.get('user_name'), ativo='relatorios')


@app.route('/notificacoes')
@adm_required
def pagina_notificacoes():
    return render_template('notificacoes.html', tipo=session.get('user_type'), nome=session.get('user_name'), ativo='notificacoes')


@app.route('/configuracoes')
@login_required
def pagina_configuracoes():
    return render_template('configuracoes.html', tipo=session.get('user_type'), nome=session.get('user_name'), ativo='configuracoes')


# =========================================================
# ROTA AUTOMATIZADA: NOTIFICAÇÕES (SMS + WHATSAPP)
# =========================================================

@app.route('/api/notificar-vencimentos', methods=['POST'])
@adm_required
def notificar_vencimentos():
    conn = None
    try:
        account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        sms_from = os.getenv('TWILIO_PHONE_NUMBER')
        whatsapp_from = os.getenv('TWILIO_WHATSAPP_NUMBER')

        client = Client(account_sid, auth_token)

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        sql = """
            SELECT F.NOME_FUN, F.TELEFONE_FUN, T.NOME_NR, R.DATA_VENCIMENTO
            FROM relatorio R
            JOIN funcionarios F ON R.ID_FUN = F.ID_FUN
            JOIN treinamentos T ON R.ID_TREIN = T.ID_TREIN
            JOIN (
                SELECT ID_FUN, ID_TREIN, MAX(DATA_VENCIMENTO) AS ULTIMO_VENCIMENTO
                FROM relatorio
                GROUP BY ID_FUN, ID_TREIN
            ) U ON U.ID_FUN = R.ID_FUN AND U.ID_TREIN = R.ID_TREIN AND U.ULTIMO_VENCIMENTO = R.DATA_VENCIMENTO
            WHERE R.DATA_VENCIMENTO IS NOT NULL
              AND R.DATA_VENCIMENTO <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        """
        cursor.execute(sql)
        vencendo = cursor.fetchall()

        contador_sucesso = 0
        for reg in vencendo:
            telefone_limpo = formatar_para_twilio(reg['TELEFONE_FUN'])

            if not telefone_limpo or len(telefone_limpo) < 12:
                print(f"Aviso: Registro de {reg['NOME_FUN']} ignorado por inconsistência no telefone.")
                continue

            venceu = reg['DATA_VENCIMENTO'] < date.today()
            vencimento_br = reg['DATA_VENCIMENTO'].strftime('%d/%m/%Y') if reg['DATA_VENCIMENTO'] else ''

            if venceu:
                mensagem = f"Olá {reg['NOME_FUN']}, seu treinamento de {reg['NOME_NR']} está VENCIDO desde {vencimento_br}. Regularize o quanto antes."
            else:
                mensagem = f"Olá {reg['NOME_FUN']}, seu treinamento de {reg['NOME_NR']} vence em breve no dia {vencimento_br}."

            client.messages.create(body=mensagem, from_=sms_from, to=telefone_limpo)
            client.messages.create(body=mensagem, from_=f"whatsapp:{whatsapp_from}", to=f"whatsapp:{telefone_limpo}")

            contador_sucesso += 1

        return jsonify({"mensagem": f"Processamento concluído. {contador_sucesso} colaboradores notificados!"}), 200

    except Exception as e:
        print(f"Erro crítico no processamento das notificações: {str(e)}")
        return jsonify({"erro": str(e)}), 500
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()


# ============================================
# ADM - TODAS AS ROTAS
# ============================================

@app.route('/api/adm', methods=['POST'])
@adm_required
def cadastrar_adm():
    try:
        dados = request.get_json()

        if not dados.get('nome') or not dados.get('email') or not dados.get('cpf'):
            return jsonify({"erro": "Nome, email e CPF são obrigatórios"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        senha_hash = generate_password_hash(dados.get('senha') or '123456')

        sql = """
        INSERT INTO adm (NOME_ADM, EMAIL_ADM, CPF_ADM, TELEFONE_ADM, CARGO_ADM, SETOR_ADM, WHATSAPP_ADM, SENHA_ADM)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """

        cursor.execute(sql, (
            dados['nome'], dados['email'], dados['cpf'],
            dados.get('telefone', ''), dados.get('cargo', ''),
            dados.get('setor', ''), dados.get('whatsapp', ''), senha_hash
        ))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"mensagem": "ADM cadastrado com sucesso!"}), 201
    except Exception as e:
        return jsonify({"Erro! ADM não cadastrado!": str(e)}), 500


@app.route('/api/adm', methods=['GET'])
@adm_required
def listar_adm():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT ID_ADM, NOME_ADM, EMAIL_ADM, CPF_ADM, TELEFONE_ADM, CARGO_ADM, SETOR_ADM, WHATSAPP_ADM FROM adm")
        resultados = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(resultados), 200
    except Exception as e:
        return jsonify({"Erro na Busca!": str(e)}), 500


@app.route('/api/adm/<int:id_adm>', methods=['GET'])
@adm_required
def listar_adm_id(id_adm):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT ID_ADM, NOME_ADM, EMAIL_ADM, CPF_ADM, TELEFONE_ADM, CARGO_ADM, SETOR_ADM, WHATSAPP_ADM FROM adm WHERE ID_ADM = %s", (id_adm,))
        resultado = cursor.fetchone()
        cursor.close()
        conn.close()
        if resultado:
            return jsonify(resultado), 200
        return jsonify({"erro": "ADM não encontrado"}), 404
    except Exception as e:
        return jsonify({"Comando Inválido!": str(e)}), 500


@app.route('/api/adm/<int:id_adm>', methods=['PUT'])
@adm_required
def atualizar_adm(id_adm):
    try:
        dados = request.get_json(force=True)
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT * FROM adm WHERE ID_ADM = %s", (id_adm,))
        existente = cursor.fetchone()
        if not existente:
            cursor.close()
            conn.close()
            return jsonify({"erro": "ADM não encontrado"}), 404

        senha_final = generate_password_hash(dados['senha']) if dados.get('senha') else existente['SENHA_ADM']

        sql = """
        UPDATE adm SET NOME_ADM=%s, EMAIL_ADM=%s, CPF_ADM=%s, TELEFONE_ADM=%s,
            CARGO_ADM=%s, SETOR_ADM=%s, WHATSAPP_ADM=%s, SENHA_ADM=%s
        WHERE ID_ADM = %s
        """
        cursor.execute(sql, (
            dados.get('nome', existente['NOME_ADM']),
            dados.get('email', existente['EMAIL_ADM']),
            dados.get('cpf', existente['CPF_ADM']),
            dados.get('telefone', existente['TELEFONE_ADM']),
            dados.get('cargo', existente['CARGO_ADM']),
            dados.get('setor', existente['SETOR_ADM']),
            dados.get('whatsapp', existente['WHATSAPP_ADM']),
            senha_final, id_adm
        ))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"mensagem": "ADM atualizado com sucesso!"}), 200
    except Exception as e:
        return jsonify({"Erro na Atualização. Dados Incorretos!": str(e)}), 500


@app.route('/api/adm/<int:id_adm>', methods=['DELETE'])
@adm_required
def deletar_adm(id_adm):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM adm WHERE ID_ADM = %s", (id_adm,))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"mensagem": "ADM deletado com sucesso!"}), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


# ============================================
# FUNCIONÁRIOS - TODAS AS ROTAS
# ============================================

@app.route('/api/funcionarios', methods=['POST'])
@adm_required
def cadastrar_fun():
    try:
        dados = request.get_json()
        if not dados.get('nome') or not dados.get('email') or not dados.get('cpf'):
            return jsonify({"erro": "Nome, email e CPF são obrigatórios"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        senha_hash = generate_password_hash(dados.get('senha') or '123456')

        sql = """
        INSERT INTO funcionarios (NOME_FUN, EMAIL_FUN, CPF_FUN, TELEFONE_FUN, CARGO_FUN, SETOR_FUN, WHATSAPP_FUN, SENHA_FUN)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(sql, (
            dados['nome'], dados['email'], dados['cpf'],
            dados.get('telefone', ''), dados.get('cargo', ''),
            dados.get('setor', ''), dados.get('whatsapp', ''), senha_hash
        ))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"mensagem": "Funcionário cadastrado com sucesso!"}), 201
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@app.route('/api/funcionarios', methods=['GET'])
@login_required
def listar_funcionarios():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT ID_FUN, NOME_FUN, EMAIL_FUN, CPF_FUN, TELEFONE_FUN, CARGO_FUN, SETOR_FUN, WHATSAPP_FUN FROM funcionarios")
        resultados = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(resultados), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@app.route('/api/funcionarios/<int:id_fun>', methods=['GET'])
@login_required
def listar_funcionario_id(id_fun):
    try:
        # funcionário comum só pode ver o próprio registro
        if session.get('user_type') == 'funcionario' and session.get('user_id') != id_fun:
            return jsonify({"erro": "Acesso negado"}), 403

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT ID_FUN, NOME_FUN, EMAIL_FUN, CPF_FUN, TELEFONE_FUN, CARGO_FUN, SETOR_FUN, WHATSAPP_FUN FROM funcionarios WHERE ID_FUN = %s", (id_fun,))
        resultado = cursor.fetchone()
        cursor.close()
        conn.close()
        if resultado:
            return jsonify(resultado), 200
        return jsonify({"erro": "Funcionário não encontrado"}), 404
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@app.route('/api/funcionarios/<int:id_fun>', methods=['PUT'])
@adm_required
def atualizar_funcionario(id_fun):
    try:
        dados = request.get_json()
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM funcionarios WHERE ID_FUN = %s", (id_fun,))
        existente = cursor.fetchone()
        if not existente:
            cursor.close()
            conn.close()
            return jsonify({"erro": "Funcionário não encontrado"}), 404

        senha_final = generate_password_hash(dados['senha']) if dados.get('senha') else existente['SENHA_FUN']

        sql = """
        UPDATE funcionarios SET NOME_FUN=%s, EMAIL_FUN=%s, CPF_FUN=%s, TELEFONE_FUN=%s,
            CARGO_FUN=%s, SETOR_FUN=%s, WHATSAPP_FUN=%s, SENHA_FUN=%s
        WHERE ID_FUN = %s
        """
        cursor.execute(sql, (
            dados.get('nome', existente['NOME_FUN']),
            dados.get('email', existente['EMAIL_FUN']),
            dados.get('cpf', existente['CPF_FUN']),
            dados.get('telefone', existente['TELEFONE_FUN']),
            dados.get('cargo', existente['CARGO_FUN']),
            dados.get('setor', existente['SETOR_FUN']),
            dados.get('whatsapp', existente['WHATSAPP_FUN']),
            senha_final, id_fun
        ))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"mensagem": "Funcionário atualizado com sucesso!"}), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@app.route('/api/funcionarios/<int:id_fun>', methods=['DELETE'])
@adm_required
def deletar_funcionario(id_fun):
    conn = None
    try:
        dados = request.get_json(silent=True) or {}
        forcar = dados.get('forcar', False)

        conn = get_db_connection()
        cursor = conn.cursor()

        if forcar:
            cursor.execute("DELETE FROM relatorio WHERE ID_FUN = %s", (id_fun,))

        cursor.execute("DELETE FROM funcionarios WHERE ID_FUN = %s", (id_fun,))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"mensagem": "Funcionário deletado com sucesso!"}), 200

    except mysql.connector.errors.IntegrityError:
        if conn and conn.is_connected():
            conn.close()
        return jsonify({
            "erro": "vinculado",
            "mensagem": "Este funcionário possui treinamentos registrados no histórico. Deseja excluir o funcionário e todo o histórico de treinamentos dele?"
        }), 409
    except Exception as e:
        if conn and conn.is_connected():
            conn.close()
        return jsonify({"erro": str(e)}), 500


# ============================================
# TREINAMENTOS - TODAS AS ROTAS
# ============================================

@app.route('/api/treinamentos', methods=['POST'])
@adm_required
def cadastrar_trein():
    try:
        dados = request.get_json()
        if not dados.get('nome'):
            return jsonify({"erro": "Nome do treinamento é obrigatório"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO treinamentos (NOME_NR, VALIDADE_DIAS, DESCRICAO_NR) VALUES (%s, %s, %s)",
                       (dados['nome'], dados.get('validade', 0), dados.get('descricao', '')))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"mensagem": "Treinamento cadastrado com sucesso!"}), 201
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@app.route('/api/treinamentos', methods=['GET'])
@login_required
def listar_treinamentos():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM treinamentos")
        resultados = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(resultados), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@app.route('/api/treinamentos/<int:id_trein>', methods=['GET'])
@login_required
def listar_treinamento_id(id_trein):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM treinamentos WHERE ID_TREIN = %s", (id_trein,))
        resultado = cursor.fetchone()
        cursor.close()
        conn.close()
        if resultado:
            return jsonify(resultado), 200
        return jsonify({"erro": "Treinamento não encontrado"}), 404
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@app.route('/api/treinamentos/<int:id_trein>', methods=['PUT'])
@adm_required
def atualizar_treinamento(id_trein):
    try:
        dados = request.get_json()
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM treinamentos WHERE ID_TREIN = %s", (id_trein,))
        existente = cursor.fetchone()
        if not existente:
            cursor.close()
            conn.close()
            return jsonify({"erro": "Treinamento não encontrado"}), 404

        cursor.execute("UPDATE treinamentos SET NOME_NR=%s, VALIDADE_DIAS=%s, DESCRICAO_NR=%s WHERE ID_TREIN=%s", (
            dados.get('nome', existente['NOME_NR']),
            dados.get('validade', existente['VALIDADE_DIAS']),
            dados.get('descricao', existente.get('DESCRICAO_NR', '')),
            id_trein
        ))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"mensagem": "Treinamento atualizado com sucesso!"}), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@app.route('/api/treinamentos/<int:id_trein>', methods=['DELETE'])
@adm_required
def deletar_treinamentos(id_trein):
    conn = None
    try:
        dados = request.get_json(silent=True) or {}
        forcar = dados.get('forcar', False)

        conn = get_db_connection()
        cursor = conn.cursor()

        if forcar:
            cursor.execute("DELETE FROM relatorio WHERE ID_TREIN = %s", (id_trein,))

        cursor.execute("DELETE FROM treinamentos WHERE ID_TREIN = %s", (id_trein,))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"mensagem": "Treinamento deletado com sucesso!"}), 200

    except mysql.connector.errors.IntegrityError:
        if conn and conn.is_connected():
            conn.close()
        return jsonify({
            "erro": "vinculado",
            "mensagem": "Este treinamento possui registros de realização no histórico. Deseja excluir o treinamento e todo o histórico vinculado a ele?"
        }), 409
    except Exception as e:
        if conn and conn.is_connected():
            conn.close()
        return jsonify({"erro": str(e)}), 500


# ============================================
# RELATÓRIOS - TODAS AS ROTAS
# ============================================

@app.route('/api/relatorio', methods=['POST'])
@adm_required
def cadastrar_rel():
    try:
        dados = request.get_json()
        if not dados.get('id_fun') or not dados.get('id_trein'):
            return jsonify({"erro": "ID do funcionário e ID do treinamento são obrigatórios"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO relatorio (ID_FUN, ID_TREIN, DATA_REALIZACAO, DATA_VENCIMENTO)
        VALUES (%s, %s, %s, %s)
        """, (dados['id_fun'], dados['id_trein'], dados.get('data_realizacao'), dados.get('data_vencimento')))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"mensagem": "Relatório cadastrado com sucesso!"}), 201
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@app.route('/api/relatorio', methods=['GET'])
@login_required
def listar_relatorios():
    try:
        # funcionário comum só enxerga os próprios relatórios
        id_fun_filtro = request.args.get('id_fun')
        if session.get('user_type') == 'funcionario':
            id_fun_filtro = session.get('user_id')

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        sql = """
        SELECT r.*, f.NOME_FUN, t.NOME_NR
        FROM relatorio r
        LEFT JOIN funcionarios f ON r.ID_FUN = f.ID_FUN
        LEFT JOIN treinamentos t ON r.ID_TREIN = t.ID_TREIN
        """
        params = ()
        if id_fun_filtro:
            sql += " WHERE r.ID_FUN = %s"
            params = (id_fun_filtro,)

        cursor.execute(sql, params)
        resultados = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(resultados), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@app.route('/api/relatorio/<int:id_rel>', methods=['GET'])
@login_required
def listar_relatorio_id(id_rel):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
        SELECT r.*, f.NOME_FUN, t.NOME_NR
        FROM relatorio r
        LEFT JOIN funcionarios f ON r.ID_FUN = f.ID_FUN
        LEFT JOIN treinamentos t ON r.ID_TREIN = t.ID_TREIN
        WHERE r.ID_REL = %s
        """, (id_rel,))
        resultado = cursor.fetchone()
        cursor.close()
        conn.close()
        if not resultado:
            return jsonify({"erro": "Relatório não encontrado"}), 404
        if session.get('user_type') == 'funcionario' and resultado['ID_FUN'] != session.get('user_id'):
            return jsonify({"erro": "Acesso negado"}), 403
        return jsonify(resultado), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@app.route('/api/relatorio/<int:id_rel>', methods=['PUT'])
@adm_required
def atualizar_relatorio(id_rel):
    try:
        dados = request.get_json()
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM relatorio WHERE ID_REL = %s", (id_rel,))
        existente = cursor.fetchone()
        if not existente:
            cursor.close()
            conn.close()
            return jsonify({"erro": "Relatório não encontrado"}), 404

        cursor.execute("""
        UPDATE relatorio SET ID_FUN=%s, ID_TREIN=%s, DATA_REALIZACAO=%s, DATA_VENCIMENTO=%s
        WHERE ID_REL = %s
        """, (
            dados.get('id_fun', existente['ID_FUN']),
            dados.get('id_trein', existente['ID_TREIN']),
            dados.get('data_realizacao', existente['DATA_REALIZACAO']),
            dados.get('data_vencimento', existente['DATA_VENCIMENTO']),
            id_rel
        ))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"mensagem": "Relatório atualizado com sucesso!"}), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@app.route('/api/relatorio/<int:id_rel>', methods=['DELETE'])
@adm_required
def deletar_rel(id_rel):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM relatorio WHERE ID_REL = %s", (id_rel,))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"mensagem": "Relatório deletado com sucesso!"}), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


# ============================================
# FUNCIONÁRIO REALIZA TREINAMENTO
# ============================================

@app.route('/api/funcionario/realizar-treinamento', methods=['POST'])
@login_required
def realizar_treinamento():
    try:
        if session.get('user_type') != 'funcionario':
            return jsonify({"erro": "Apenas funcionários podem realizar treinamentos por aqui"}), 403

        dados = request.get_json()
        id_trein = dados.get('id_trein')
        if not id_trein:
            return jsonify({"erro": "Selecione um treinamento"}), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT * FROM treinamentos WHERE ID_TREIN = %s", (id_trein,))
        treinamento = cursor.fetchone()
        if not treinamento:
            cursor.close()
            conn.close()
            return jsonify({"erro": "Treinamento não encontrado"}), 404

        hoje = date.today()

        # Verifica se já existe um registro anterior deste treinamento para o funcionário
        # e, em caso positivo, se ainda falta mais de 30 dias para o vencimento dele.
        cursor.execute("""
            SELECT DATA_VENCIMENTO FROM relatorio
            WHERE ID_FUN = %s AND ID_TREIN = %s
            ORDER BY DATA_VENCIMENTO DESC
            LIMIT 1
        """, (session.get('user_id'), id_trein))
        ultimo = cursor.fetchone()

        if ultimo and ultimo['DATA_VENCIMENTO']:
            data_liberacao = ultimo['DATA_VENCIMENTO'] - timedelta(days=30)
            if hoje < data_liberacao:
                cursor.close()
                conn.close()
                return jsonify({
                    "erro": f"Você já realizou este treinamento e ele ainda está válido até "
                            f"{ultimo['DATA_VENCIMENTO'].strftime('%d/%m/%Y')}. "
                            f"Só será possível refazê-lo a partir de {data_liberacao.strftime('%d/%m/%Y')} "
                            f"(30 dias antes do vencimento)."
                }), 409

        vencimento = hoje + timedelta(days=treinamento['VALIDADE_DIAS'])

        cursor.execute("""
        INSERT INTO relatorio (ID_FUN, ID_TREIN, DATA_REALIZACAO, DATA_VENCIMENTO)
        VALUES (%s, %s, %s, %s)
        """, (session.get('user_id'), id_trein, hoje, vencimento))

        conn.commit()
        cursor.close()
        conn.close()

        vencimento_br = vencimento.strftime('%d/%m/%Y')
        return jsonify({"mensagem": f"Treinamento {treinamento['NOME_NR']} realizado com sucesso! Válido até {vencimento_br}."}), 201
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
