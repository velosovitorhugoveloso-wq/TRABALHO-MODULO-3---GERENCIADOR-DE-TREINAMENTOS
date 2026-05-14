# TRABALHO-MODULO-3---GERENCIADOR-DE-TREINAMENTOS
GRUPO: Davi Pádua, Luany Garcia, Vitor Hugo Veloso, Matheus Eduardo e Kauan Gabriel.
[LOGIN.py](https://github.com/user-attachments/files/27780495/LOGIN.py)
usuarios_adm = []
usuarios_funcionario = []


def cadastrar_adm():
    print("\n===== CADASTRO ADM =====")

    nome = input("Nome: ")
    email = input("E-mail: ")
    cpf = input("CPF: ")
    senha = input("Senha: ")

    adm = {
        "nome": nome,
        "email": email,
        "cpf": cpf,
        "senha": senha
    }

    usuarios_adm.append(adm)

    print("\nADM cadastrado com sucesso!")


def login_adm():
    print("\n===== LOGIN ADM =====")

    email = input("E-mail: ")
    senha = input("Senha: ")

    for adm in usuarios_adm:
        if adm["email"] == email and adm["senha"] == senha:
            print(f"\nBem-vindo ADM {adm['nome']}!")
            return

    print("\nE-mail ou senha incorretos!")


def cadastrar_funcionario():
    print("\n===== CADASTRO FUNCIONÁRIO =====")

    nome = input("Nome: ")
    email = input("E-mail: ")
    cpf = input("CPF: ")
    senha = input("Senha: ")
    curso_treinamento = input("Curso de treinamento: ")

    funcionario = {
        "nome": nome,
        "email": email,
        "cpf": cpf,
        "senha": senha,
        "curso_treinamento": curso_treinamento
    }

    usuarios_funcionario.append(funcionario)

    print("\nFuncionário cadastrado com sucesso!")


def login_funcionario():
    print("\n===== LOGIN FUNCIONÁRIO =====")

    email = input("E-mail: ")
    senha = input("Senha: ")

    for funcionario in usuarios_funcionario:
        if funcionario["email"] == email and funcionario["senha"] == senha:
            print(f"\nBem-vindo funcionário {funcionario['nome']}!")
            print(f"Curso de treinamento: {funcionario['curso_treinamento']}")
            return

    print("\nE-mail ou senha incorretos!")


while True:

    print("\n========== SISTEMA ==========")
    print("1 - Cadastrar ADM")
    print("2 - Login ADM")
    print("3 - Cadastrar Funcionário")
    print("4 - Login Funcionário")
    print("5 - Sair")

    opcao = input("Escolha uma opção: ")

    if opcao == "1":
        cadastrar_adm()

    elif opcao == "2":
        login_adm()

    elif opcao == "3":
        cadastrar_funcionario()

    elif opcao == "4":
        login_funcionario()

    elif opcao == "5":
        print("\nSistema encerrado.")
        break

    else:
        print("\nOpção inválida!")
