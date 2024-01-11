create database rrff;
use rrff;
create table historialconsulta
(
    idHistorialConsulta bigint auto_increment
        primary key,
    idPersona           bigint   null,
    fecha               datetime null,
    rangoBusqueda       text     null,
    entradaBusqueda     text     null,
    datoSolicitado      text     null,
    nombre              text     null,
    resultado           text     null,
    archivo             int      null,
    tipoBusqueda        text     null,
    pm                  text     null,
    body                text     null
);

create table rol
(
    idRol     bigint auto_increment
        primary key,
    nombreRol text null
);

create table persona
(
    idPersona bigint auto_increment
        primary key,
    ad        text   null,
    password  text   null,
    idRol     bigint null,
    activo    int    null,
    foto      text   null,
    constraint persona_ibfk_1
        foreign key (idRol) references rol (idRol)
);

create table historialcambios
(
    idHistorialCambios bigint auto_increment
        primary key,
    cambio             text     null,
    idPersona          bigint   null,
    fecha              datetime null,
    accion             text     null,
    constraint historialcambios_ibfk_1
        foreign key (idPersona) references persona (idPersona)
);

create index idPersona
    on historialcambios (idPersona);

create index idRol
    on persona (idRol);

create table sessions
(
    session_id varchar(128) collate utf8mb4_bin not null
        primary key,
    expires    int(11) unsigned                 not null,
    data       mediumtext collate utf8mb4_bin   null
);

