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

# CLASSES

class Adm:
    def _init_(self, id_adm, nome_adm, cpf_adm, email_adm, telefone_adm, cargo_adm, setor_adm):
        self.id_adm = id_adm
        self.nome_adm = nome_adm
        self.cpf_adm = cpf_adm
        self.email_adm = email_adm
        self.telefone_adm = telefone_adm
        self.cargo_adm = cargo_adm
        self.setor_adm = setor_adm


class Funcionarios:
    def _init_(self, id_fun, nome_fun, cpf_fun, email_fun, telefone_fun, cargo_fun, setor_fun):
        self.id_fun = id_fun
        self.nome_fun = nome_fun
        self.cpf_fun = cpf_fun
        self.email_fun = email_fun
        self.telefone_fun = telefone_fun
        self.cargo_fun = cargo_fun
        self.setor_fun = setor_fun


class Relatorio:
    def _init_(self, id_rel, id_fun, id_trein, data_realizacao, data_vencimento):
        self.id_rel = id_rel
        self.id_fun = id_fun
        self.id_trein = id_trein
        self.data_realizacao = data_realizacao
        self.data_vencimento = data_vencimento


class Treinamentos:
    def _init_(self, id_trein, nome_nr, validade_dias):
        self.id_trein = id_trein
        self.nome_nr = nome_nr
        self.validade_dias = validade_dias


# ==========================
# POST ADM
# ==========================

@app.route('/api/adm', methods=['POST'])
def cadastrar_adm():
    dados = request.get_json()

    adm = Adm(
        None,
        dados['nome'],
        dados['email'],
        dados['cpf'],
        dados['telefone'],
        dados['cargo'],
        dados['setor']
    )

    conn = get_db_connection()
    cursor = conn.cursor()

    sql = """
    INSERT INTO adm
    (NOME_ADM, EMAIL_ADM, CPF_ADM, TELEFONE_ADM, CARGO_ADM, SETOR_ADM)
    VALUES (%s, %s, %s, %s, %s, %s)
    """

    cursor.execute(sql, (
        adm.nome_adm,
        adm.email_adm,
        adm.cpf_adm,
        adm.telefone_adm,
        adm.cargo_adm,
        adm.setor_adm
    ))

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"mensagem": "Adm cadastrado!"}), 201


# ==========================
# POST FUNCIONÁRIOS
# ==========================

@app.route('/api/funcionarios', methods=['POST'])
def cadastrar_fun():
    dados = request.get_json()

    func = Funcionarios(
        None,
        dados['nome'],
        dados['email'],
        dados['cpf'],
        dados['telefone'],
        dados['cargo'],
        dados['setor']
    )

    conn = get_db_connection()
    cursor = conn.cursor()

    sql = """
    INSERT INTO funcionarios
    (NOME_FUN, EMAIL_FUN, CPF_FUN,  TELEFONE_FUN, CARGO_FUN, SETOR_FUN)
    VALUES (%s, %s, %s, %s, %s, %s)
    """

    cursor.execute(sql, (
        func.nome_fun,
        func.email_fun,
        func.cpf_fun,
        func.telefone_fun,
        func.cargo_fun,
        func.setor_fun
    ))

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"mensagem": "Funcionário cadastrado!"}), 201


# ==========================
# POST TREINAMENTOS
# ==========================

@app.route('/api/treinamentos', methods=['POST'])
def cadastrar_trein():
    dados = request.get_json()

    trein = Treinamentos(
        None,
        dados['nome'],
        dados['validade']
    )

    conn = get_db_connection()
    cursor = conn.cursor()

    sql = """
    INSERT INTO treinamentos
    (NOME_NR, VALIDADE_DIAS)
    VALUES (%s, %s)
    """

    cursor.execute(sql, (
        trein.nome_nr,
        trein.validade_dias
    ))

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"mensagem": "Treinamento cadastrado!"}), 201


# ==========================
# POST RELATÓRIO
# ==========================

@app.route('/api/relatorio', methods=['POST'])
def cadastrar_rel():
    dados = request.get_json()

    rel = Relatorio(
        None,
        dados['id_fun'],
        dados['id_trein'],
        dados['data_realizacao'],
        dados['data_vencimento']
    )

    conn = get_db_connection()
    cursor = conn.cursor()

    sql = """
    INSERT INTO relatorio
    (ID_FUN, ID_TREIN, DATA_REALIZACAO, DATA_VENCIMENTO)
    VALUES (%s, %s, %s, %s)
    """

    cursor.execute(sql, (
        rel.id_fun,
        rel.id_trein,
        rel.data_realizacao,
        rel.data_vencimento
    ))

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"mensagem": "Relatório emitido!"}), 201


# ==========================
# EXECUÇÃO
# ==========================

if __name__ == '__main__':
    app.run(debug=True)