create table relatorio(
	ID_REL int auto_increment primary key,
	ID_FUN int ,
    ID_TREIN int, 
    DATA_REALIZACAO date,
    DATA_VENCIMENTO date,
    
    foreign key (ID_FUN) references funcionarios(ID_FUN),
    foreign key (ID_TREIN) references treinamentos(ID_TREIN)
);

