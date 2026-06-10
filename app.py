from flask import Flask, request, jsonify
import mysql.connector

app = Flask(__name__)

db_config = {
    'host': 'localhost',
    'database': 'mod3',
    'user': 'root',
    'password': '0000'
}

def get_db_connection():
    return mysql.connector.connect(**db_config)

# ============================================
# CLASSES 
# ============================================

class Adm:
    def __init__(self, id_adm, nome_adm, email_adm, cpf_adm, telefone_adm, cargo_adm, setor_adm):
        self.id_adm = id_adm
        self.nome_adm = nome_adm
        self.email_adm = email_adm
        self.cpf_adm = cpf_adm
        self.telefone_adm = telefone_adm
        self.cargo_adm = cargo_adm
        self.setor_adm = setor_adm


class Funcionarios:
    def __init__(self, id_fun, nome_fun, email_fun, cpf_fun, telefone_fun, cargo_fun, setor_fun):
        self.id_fun = id_fun
        self.nome_fun = nome_fun
        self.email_fun = email_fun
        self.cpf_fun = cpf_fun
        self.telefone_fun = telefone_fun
        self.cargo_fun = cargo_fun
        self.setor_fun = setor_fun


class Relatorio:
    def __init__(self, id_rel, id_fun, id_trein, data_realizacao, data_vencimento):
        self.id_rel = id_rel
        self.id_fun = id_fun
        self.id_trein = id_trein
        self.data_realizacao = data_realizacao
        self.data_vencimento = data_vencimento


class Treinamentos:
    def __init__(self, id_trein, nome_nr, validade_dias):
        self.id_trein = id_trein
        self.nome_nr = nome_nr
        self.validade_dias = validade_dias


# ============================================
# ADM - TODAS AS ROTAS
# ============================================

# POST - Criar ADM
@app.route('/api/adm', methods=['POST'])
def cadastrar_adm():
    try:
        dados = request.get_json()
        
        # Validações
        if not dados.get('nome') or not dados.get('email') or not dados.get('cpf'):
            return jsonify({"erro": "Nome, email e CPF são obrigatórios"}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        sql = """
        INSERT INTO adm (NOME_ADM, EMAIL_ADM, CPF_ADM, TELEFONE_ADM, CARGO_ADM, SETOR_ADM)
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        
        cursor.execute(sql, (
            dados['nome'],
            dados['email'],
            dados['cpf'],
            dados.get('telefone', ''),
            dados.get('cargo', ''),
            dados.get('setor', '')
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({"mensagem": "ADM cadastrado com sucesso!"}), 201
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

# GET - Listar todos os ADMs
@app.route('/api/adm', methods=['GET'])
def listar_adm():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        sql = "SELECT * FROM adm"
        cursor.execute(sql)
        
        resultados = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify(resultados), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

# GET - Listar ADM por ID
@app.route('/api/adm/<int:id_adm>', methods=['GET'])
def listar_adm_id(id_adm):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        sql = "SELECT * FROM adm WHERE ID_ADM = %s"
        cursor.execute(sql, (id_adm,))
        
        resultado = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if resultado:
            return jsonify(resultado), 200
        else:
            return jsonify({"erro": "ADM não encontrado"}), 404
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

# PUT - Atualizar ADM
@app.route('/api/adm/<int:id_adm>', methods=['PUT'])
def atualizar_adm(id_adm):
    try:
        dados = request.get_json()
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Verificar se existe
        sql_check = "SELECT * FROM adm WHERE ID_ADM = %s"
        cursor.execute(sql_check, (id_adm,))
        existente = cursor.fetchone()
        
        if not existente:
            cursor.close()
            conn.close()
            return jsonify({"erro": "ADM não encontrado"}), 404
        
        # Atualizar
        sql = """
        UPDATE adm SET 
            NOME_ADM = %s, 
            EMAIL_ADM = %s, 
            CPF_ADM = %s, 
            TELEFONE_ADM = %s, 
            CARGO_ADM = %s, 
            SETOR_ADM = %s
        WHERE ID_ADM = %s
        """
        
        cursor.execute(sql, (
            dados.get('nome', existente['NOME_ADM']),
            dados.get('email', existente['EMAIL_ADM']),
            dados.get('cpf', existente['CPF_ADM']),
            dados.get('telefone', existente['TELEFONE_ADM']),
            dados.get('cargo', existente['CARGO_ADM']),
            dados.get('setor', existente['SETOR_ADM']),
            id_adm
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({"mensagem": "ADM atualizado com sucesso!"}), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

# DELETE - Excluir ADM
@app.route('/api/adm/<int:id_adm>', methods=['DELETE'])
def deletar_adm(id_adm):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        sql = "DELETE FROM adm WHERE ID_ADM = %s"
        cursor.execute(sql, (id_adm,))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({"mensagem": "ADM deletado com sucesso!"}), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


# ============================================
# FUNCIONÁRIOS - TODAS AS ROTAS
# ============================================

# POST - Criar Funcionário
@app.route('/api/funcionarios', methods=['POST'])
def cadastrar_fun():
    try:
        dados = request.get_json()
        
        if not dados.get('nome') or not dados.get('email') or not dados.get('cpf'):
            return jsonify({"erro": "Nome, email e CPF são obrigatórios"}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        sql = """
        INSERT INTO funcionarios (NOME_FUN, EMAIL_FUN, CPF_FUN, TELEFONE_FUN, CARGO_FUN, SETOR_FUN)
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        
        cursor.execute(sql, (
            dados['nome'],
            dados['email'],
            dados['cpf'],
            dados.get('telefone', ''),
            dados.get('cargo', ''),
            dados.get('setor', '')
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({"mensagem": "Funcionário cadastrado com sucesso!"}), 201
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

# GET - Listar todos os Funcionários
@app.route('/api/funcionarios', methods=['GET'])
def listar_funcionarios():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        sql = "SELECT * FROM funcionarios"
        cursor.execute(sql)
        
        resultados = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify(resultados), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

# GET - Listar Funcionário por ID
@app.route('/api/funcionarios/<int:id_fun>', methods=['GET'])
def listar_funcionario_id(id_fun):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        sql = "SELECT * FROM funcionarios WHERE ID_FUN = %s"
        cursor.execute(sql, (id_fun,))
        
        resultado = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if resultado:
            return jsonify(resultado), 200
        else:
            return jsonify({"erro": "Funcionário não encontrado"}), 404
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

# PUT - Atualizar Funcionário
@app.route('/api/funcionarios/<int:id_fun>', methods=['PUT'])
def atualizar_funcionario(id_fun):
    try:
        dados = request.get_json()
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        sql_check = "SELECT * FROM funcionarios WHERE ID_FUN = %s"
        cursor.execute(sql_check, (id_fun,))
        existente = cursor.fetchone()
        
        if not existente:
            cursor.close()
            conn.close()
            return jsonify({"erro": "Funcionário não encontrado"}), 404
        
        sql = """
        UPDATE funcionarios SET 
            NOME_FUN = %s, 
            EMAIL_FUN = %s, 
            CPF_FUN = %s, 
            TELEFONE_FUN = %s, 
            CARGO_FUN = %s, 
            SETOR_FUN = %s
        WHERE ID_FUN = %s
        """
        
        cursor.execute(sql, (
            dados.get('nome', existente['NOME_FUN']),
            dados.get('email', existente['EMAIL_FUN']),
            dados.get('cpf', existente['CPF_FUN']),
            dados.get('telefone', existente['TELEFONE_FUN']),
            dados.get('cargo', existente['CARGO_FUN']),
            dados.get('setor', existente['SETOR_FUN']),
            id_fun
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({"mensagem": "Funcionário atualizado com sucesso!"}), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

# DELETE - Excluir Funcionário
@app.route('/api/funcionarios/<int:id_fun>', methods=['DELETE'])
def deletar_funcionario(id_fun):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        sql = "DELETE FROM funcionarios WHERE ID_FUN = %s"
        cursor.execute(sql, (id_fun,))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({"mensagem": "Funcionário deletado com sucesso!"}), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


# ============================================
# TREINAMENTOS - TODAS AS ROTAS
# ============================================

# POST - Criar Treinamento
@app.route('/api/treinamentos', methods=['POST'])
def cadastrar_trein():
    try:
        dados = request.get_json()
        
        if not dados.get('nome'):
            return jsonify({"erro": "Nome do treinamento é obrigatório"}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        sql = "INSERT INTO treinamentos (NOME_NR, VALIDADE_DIAS) VALUES (%s, %s)"
        
        cursor.execute(sql, (
            dados['nome'],
            dados.get('validade', 0)
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({"mensagem": "Treinamento cadastrado com sucesso!"}), 201
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

# GET - Listar todos os Treinamentos
@app.route('/api/treinamentos', methods=['GET'])
def listar_treinamentos():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        sql = "SELECT * FROM treinamentos"
        cursor.execute(sql)
        
        resultados = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify(resultados), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

# GET - Listar Treinamento por ID
@app.route('/api/treinamentos/<int:id_trein>', methods=['GET'])
def listar_treinamento_id(id_trein):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        sql = "SELECT * FROM treinamentos WHERE ID_TREIN = %s"
        cursor.execute(sql, (id_trein,))
        
        resultado = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if resultado:
            return jsonify(resultado), 200
        else:
            return jsonify({"erro": "Treinamento não encontrado"}), 404
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

# PUT - Atualizar Treinamento
@app.route('/api/treinamentos/<int:id_trein>', methods=['PUT'])
def atualizar_treinamento(id_trein):
    try:
        dados = request.get_json()
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        sql_check = "SELECT * FROM treinamentos WHERE ID_TREIN = %s"
        cursor.execute(sql_check, (id_trein,))
        existente = cursor.fetchone()
        
        if not existente:
            cursor.close()
            conn.close()
            return jsonify({"erro": "Treinamento não encontrado"}), 404
        
        sql = """
        UPDATE treinamentos SET 
            NOME_NR = %s, 
            VALIDADE_DIAS = %s
        WHERE ID_TREIN = %s
        """
        
        cursor.execute(sql, (
            dados.get('nome', existente['NOME_NR']),
            dados.get('validade', existente['VALIDADE_DIAS']),
            id_trein
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({"mensagem": "Treinamento atualizado com sucesso!"}), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

# DELETE - Excluir Treinamento
@app.route('/api/treinamentos/<int:id_trein>', methods=['DELETE'])
def deletar_treinamentos(id_trein):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        sql = "DELETE FROM treinamentos WHERE ID_TREIN = %s"
        cursor.execute(sql, (id_trein,))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({"mensagem": "Treinamento deletado com sucesso!"}), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


# ============================================
# RELATÓRIOS - TODAS AS ROTAS
# ============================================

# POST - Criar Relatório
@app.route('/api/relatorio', methods=['POST'])
def cadastrar_rel():
    try:
        dados = request.get_json()
        
        if not dados.get('id_fun') or not dados.get('id_trein'):
            return jsonify({"erro": "ID do funcionário e ID do treinamento são obrigatórios"}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        sql = """
        INSERT INTO relatorio (ID_FUN, ID_TREIN, DATA_REALIZACAO, DATA_VENCIMENTO)
        VALUES (%s, %s, %s, %s)
        """
        
        cursor.execute(sql, (
            dados['id_fun'],
            dados['id_trein'],
            dados.get('data_realizacao', None),
            dados.get('data_vencimento', None)
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({"mensagem": "Relatório cadastrado com sucesso!"}), 201
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

# GET - Listar todos os Relatórios
@app.route('/api/relatorio', methods=['GET'])
def listar_relatorios():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        sql = """
        SELECT r.*, f.NOME_FUN, t.NOME_NR 
        FROM relatorio r
        LEFT JOIN funcionarios f ON r.ID_FUN = f.ID_FUN
        LEFT JOIN treinamentos t ON r.ID_TREIN = t.ID_TREIN
        """
        cursor.execute(sql)
        
        resultados = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify(resultados), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

# GET - Listar Relatório por ID
@app.route('/api/relatorio/<int:id_rel>', methods=['GET'])
def listar_relatorio_id(id_rel):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        sql = """
        SELECT r.*, f.NOME_FUN, t.NOME_NR
        FROM relatorio r
        LEFT JOIN funcionarios f ON r.ID_FUN = f.ID_FUN
        LEFT JOIN treinamentos t ON r.ID_TREIN = t.ID_TREIN
        WHERE r.ID_REL = %s
        """

        cursor.execute(sql, (id_rel,))
        resultado = cursor.fetchone()

        cursor.close()
        conn.close()

        if resultado:
            return jsonify(resultado), 200
        else:
            return jsonify({"erro": "Relatório não encontrado"}), 404

    except Exception as e:
        return jsonify({"erro": str(e)}), 500
    
if __name__ == '__main__':
    app.run(debug=True)