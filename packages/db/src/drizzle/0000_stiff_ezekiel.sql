-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."estado_calificacion" AS ENUM('en_progreso', 'completado', 'aprobado', 'devuelto');--> statement-breakpoint
CREATE TYPE "public"."estado_concurso" AS ENUM('borrador', 'publicado', 'cerrado', 'en_evaluacion', 'finalizado');--> statement-breakpoint
CREATE TYPE "public"."estado_postulacion" AS ENUM('borrador', 'enviado', 'observado', 'rechazado', 'en_evaluacion', 'calificado', 'ganador', 'no_seleccionado');--> statement-breakpoint
CREATE TYPE "public"."nivel_enum" AS ENUM('basico', 'intermedio', 'avanzado');--> statement-breakpoint
CREATE TYPE "public"."rol_usuario" AS ENUM('administrador', 'responsable_concurso', 'proponente', 'evaluador');--> statement-breakpoint
CREATE TYPE "public"."tipo_criterio" AS ENUM('economico', 'tecnico', 'medioambiental', 'social', 'financiero');--> statement-breakpoint
CREATE TYPE "public"."tipo_notificacion" AS ENUM('observacion_propuesta', 'rechazo_propuesta', 'asignacion_evaluador', 'devolucion_calificacion', 'propuesta_calificada', 'propuesta_ganadora', 'propuesta_no_seleccionada', 'general');--> statement-breakpoint
CREATE TABLE "usuario" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "usuario_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"rol" "rol_usuario" NOT NULL,
	"nombre" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_usuario_email" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "empresa" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "empresa_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"usuario_id" integer NOT NULL,
	"razon_social" text NOT NULL,
	"nit" text NOT NULL,
	"registro_seprec" text,
	"tipo_empresa" text,
	"departamento" text,
	"anio_fundacion" integer,
	"rubro" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_empresa_usuario" UNIQUE("usuario_id"),
	CONSTRAINT "uq_empresa_nit" UNIQUE("nit")
);
--> statement-breakpoint
CREATE TABLE "concurso" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "concurso_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nombre" text NOT NULL,
	"descripcion" text,
	"bases" text,
	"fecha_inicio_postulacion" date NOT NULL,
	"fecha_cierre_postulacion" date NOT NULL,
	"fecha_anuncio_ganadores" date,
	"monto_premio" numeric(12, 2) NOT NULL,
	"numero_ganadores" integer DEFAULT 3 NOT NULL,
	"top_n_sistema" integer DEFAULT 5 NOT NULL,
	"departamentos" text[] NOT NULL,
	"estado" "estado_concurso" DEFAULT 'borrador' NOT NULL,
	"fecha_publicacion_resultados" timestamp with time zone,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_concurso_fechas" CHECK (fecha_cierre_postulacion >= fecha_inicio_postulacion),
	CONSTRAINT "chk_concurso_monto" CHECK (monto_premio > (0)::numeric),
	CONSTRAINT "chk_concurso_ganadores" CHECK (numero_ganadores > 0),
	CONSTRAINT "chk_concurso_top_n" CHECK (top_n_sistema > 0)
);
--> statement-breakpoint
CREATE TABLE "responsable_concurso" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "responsable_concurso_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"concurso_id" integer NOT NULL,
	"usuario_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_responsable_concurso_usuario" UNIQUE("concurso_id","usuario_id")
);
--> statement-breakpoint
CREATE TABLE "documento_concurso" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "documento_concurso_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"concurso_id" integer NOT NULL,
	"nombre" text NOT NULL,
	"storage_key" text NOT NULL,
	"nombre_original" text NOT NULL,
	"mime_type" text NOT NULL,
	"tamano_bytes" bigint NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_documento_tamano" CHECK (tamano_bytes > 0)
);
--> statement-breakpoint
CREATE TABLE "formulario_dinamico" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "formulario_dinamico_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"concurso_id" integer NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"schema_definition" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_formulario_concurso" UNIQUE("concurso_id"),
	CONSTRAINT "chk_formulario_version" CHECK (version >= 1)
);
--> statement-breakpoint
CREATE TABLE "postulacion" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "postulacion_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"concurso_id" integer NOT NULL,
	"empresa_id" integer NOT NULL,
	"estado" "estado_postulacion" DEFAULT 'borrador' NOT NULL,
	"response_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"porcentaje_completado" numeric(5, 2) DEFAULT '0' NOT NULL,
	"fecha_envio" timestamp with time zone,
	"observacion" text,
	"puntaje_final" numeric(6, 2),
	"posicion_final" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_postulacion_concurso_empresa" UNIQUE("concurso_id","empresa_id"),
	CONSTRAINT "chk_postulacion_porcentaje" CHECK ((porcentaje_completado >= (0)::numeric) AND (porcentaje_completado <= (100)::numeric)),
	CONSTRAINT "chk_postulacion_puntaje" CHECK ((puntaje_final IS NULL) OR (puntaje_final >= (0)::numeric)),
	CONSTRAINT "chk_postulacion_posicion" CHECK ((posicion_final IS NULL) OR (posicion_final > 0))
);
--> statement-breakpoint
CREATE TABLE "archivo_postulacion" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "archivo_postulacion_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"postulacion_id" integer NOT NULL,
	"field_id" text NOT NULL,
	"nombre_original" text NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"tamano_bytes" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_archivo_tamano" CHECK (tamano_bytes > 0)
);
--> statement-breakpoint
CREATE TABLE "rubrica" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "rubrica_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"concurso_id" integer NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"puntaje_total" numeric(6, 2) DEFAULT '100' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_rubrica_concurso" UNIQUE("concurso_id"),
	CONSTRAINT "chk_rubrica_puntaje" CHECK (puntaje_total > (0)::numeric)
);
--> statement-breakpoint
CREATE TABLE "criterio" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "criterio_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"rubrica_id" integer NOT NULL,
	"tipo" "tipo_criterio" NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"peso_porcentaje" numeric(5, 2) NOT NULL,
	"orden" integer NOT NULL,
	CONSTRAINT "chk_criterio_peso" CHECK ((peso_porcentaje > (0)::numeric) AND (peso_porcentaje <= (100)::numeric)),
	CONSTRAINT "chk_criterio_orden" CHECK (orden > 0)
);
--> statement-breakpoint
CREATE TABLE "sub_criterio" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sub_criterio_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"criterio_id" integer NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"peso_porcentaje" numeric(5, 2) NOT NULL,
	"orden" integer NOT NULL,
	CONSTRAINT "chk_sub_criterio_peso" CHECK ((peso_porcentaje > (0)::numeric) AND (peso_porcentaje <= (100)::numeric)),
	CONSTRAINT "chk_sub_criterio_orden" CHECK (orden > 0)
);
--> statement-breakpoint
CREATE TABLE "nivel_evaluacion" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "nivel_evaluacion_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"sub_criterio_id" integer NOT NULL,
	"nivel" "nivel_enum" NOT NULL,
	"descripcion" text NOT NULL,
	"puntaje_min" numeric(5, 2) NOT NULL,
	"puntaje_max" numeric(5, 2) NOT NULL,
	CONSTRAINT "uq_nivel_sub_criterio_nivel" UNIQUE("sub_criterio_id","nivel"),
	CONSTRAINT "chk_nivel_rango" CHECK ((puntaje_max >= puntaje_min) AND (puntaje_min >= (0)::numeric))
);
--> statement-breakpoint
CREATE TABLE "asignacion_evaluador" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "asignacion_evaluador_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"postulacion_id" integer NOT NULL,
	"evaluador_id" integer NOT NULL,
	"asignado_por" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_asignacion_postulacion_evaluador" UNIQUE("postulacion_id","evaluador_id")
);
--> statement-breakpoint
CREATE TABLE "calificacion" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "calificacion_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"postulacion_id" integer NOT NULL,
	"evaluador_id" integer NOT NULL,
	"puntaje_total" numeric(6, 2),
	"estado" "estado_calificacion" DEFAULT 'en_progreso' NOT NULL,
	"comentario_general" text,
	"comentario_responsable" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_calificacion_postulacion_evaluador" UNIQUE("postulacion_id","evaluador_id"),
	CONSTRAINT "chk_calificacion_puntaje" CHECK ((puntaje_total IS NULL) OR (puntaje_total >= (0)::numeric))
);
--> statement-breakpoint
CREATE TABLE "calificacion_detalle" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "calificacion_detalle_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"calificacion_id" integer NOT NULL,
	"sub_criterio_id" integer NOT NULL,
	"puntaje" numeric(5, 2) NOT NULL,
	"justificacion" text,
	CONSTRAINT "uq_detalle_calificacion_sub_criterio" UNIQUE("calificacion_id","sub_criterio_id"),
	CONSTRAINT "chk_detalle_puntaje" CHECK (puntaje >= (0)::numeric)
);
--> statement-breakpoint
CREATE TABLE "notificacion_email" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notificacion_email_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"destinatario_id" integer NOT NULL,
	"remitente_id" integer,
	"concurso_id" integer,
	"postulacion_id" integer,
	"tipo" "tipo_notificacion" NOT NULL,
	"asunto" text NOT NULL,
	"contenido" text NOT NULL,
	"enviado" boolean DEFAULT false NOT NULL,
	"fecha_envio" timestamp with time zone,
	"error_envio" text,
	"intentos" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_notificacion_intentos" CHECK (intentos >= 0)
);
--> statement-breakpoint
CREATE TABLE "sesion_refresh_token" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sesion_refresh_token_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"usuario_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"expira_en" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "empresa" ADD CONSTRAINT "fk_empresa_usuario" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concurso" ADD CONSTRAINT "fk_concurso_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responsable_concurso" ADD CONSTRAINT "fk_responsable_concurso" FOREIGN KEY ("concurso_id") REFERENCES "public"."concurso"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responsable_concurso" ADD CONSTRAINT "fk_responsable_usuario" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento_concurso" ADD CONSTRAINT "fk_documento_concurso" FOREIGN KEY ("concurso_id") REFERENCES "public"."concurso"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formulario_dinamico" ADD CONSTRAINT "fk_formulario_concurso" FOREIGN KEY ("concurso_id") REFERENCES "public"."concurso"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postulacion" ADD CONSTRAINT "fk_postulacion_concurso" FOREIGN KEY ("concurso_id") REFERENCES "public"."concurso"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postulacion" ADD CONSTRAINT "fk_postulacion_empresa" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "archivo_postulacion" ADD CONSTRAINT "fk_archivo_postulacion" FOREIGN KEY ("postulacion_id") REFERENCES "public"."postulacion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rubrica" ADD CONSTRAINT "fk_rubrica_concurso" FOREIGN KEY ("concurso_id") REFERENCES "public"."concurso"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "criterio" ADD CONSTRAINT "fk_criterio_rubrica" FOREIGN KEY ("rubrica_id") REFERENCES "public"."rubrica"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_criterio" ADD CONSTRAINT "fk_sub_criterio_criterio" FOREIGN KEY ("criterio_id") REFERENCES "public"."criterio"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nivel_evaluacion" ADD CONSTRAINT "fk_nivel_sub_criterio" FOREIGN KEY ("sub_criterio_id") REFERENCES "public"."sub_criterio"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asignacion_evaluador" ADD CONSTRAINT "fk_asignacion_postulacion" FOREIGN KEY ("postulacion_id") REFERENCES "public"."postulacion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asignacion_evaluador" ADD CONSTRAINT "fk_asignacion_evaluador" FOREIGN KEY ("evaluador_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asignacion_evaluador" ADD CONSTRAINT "fk_asignacion_asignado_por" FOREIGN KEY ("asignado_por") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calificacion" ADD CONSTRAINT "fk_calificacion_postulacion" FOREIGN KEY ("postulacion_id") REFERENCES "public"."postulacion"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calificacion" ADD CONSTRAINT "fk_calificacion_evaluador" FOREIGN KEY ("evaluador_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calificacion_detalle" ADD CONSTRAINT "fk_detalle_calificacion" FOREIGN KEY ("calificacion_id") REFERENCES "public"."calificacion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calificacion_detalle" ADD CONSTRAINT "fk_detalle_sub_criterio" FOREIGN KEY ("sub_criterio_id") REFERENCES "public"."sub_criterio"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificacion_email" ADD CONSTRAINT "fk_notificacion_destinatario" FOREIGN KEY ("destinatario_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificacion_email" ADD CONSTRAINT "fk_notificacion_remitente" FOREIGN KEY ("remitente_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificacion_email" ADD CONSTRAINT "fk_notificacion_concurso" FOREIGN KEY ("concurso_id") REFERENCES "public"."concurso"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificacion_email" ADD CONSTRAINT "fk_notificacion_postulacion" FOREIGN KEY ("postulacion_id") REFERENCES "public"."postulacion"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesion_refresh_token" ADD CONSTRAINT "fk_sesion_usuario" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_responsable_concurso_id" ON "responsable_concurso" USING btree ("concurso_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_responsable_usuario_id" ON "responsable_concurso" USING btree ("usuario_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_documento_concurso_id" ON "documento_concurso" USING btree ("concurso_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_formulario_schema_gin" ON "formulario_dinamico" USING gin ("schema_definition" jsonb_path_ops);--> statement-breakpoint
CREATE INDEX "idx_postulacion_concurso_estado" ON "postulacion" USING btree ("concurso_id" enum_ops,"estado" enum_ops);--> statement-breakpoint
CREATE INDEX "idx_postulacion_empresa_id" ON "postulacion" USING btree ("empresa_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_archivo_postulacion_id" ON "archivo_postulacion" USING btree ("postulacion_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_criterio_rubrica_id" ON "criterio" USING btree ("rubrica_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_sub_criterio_criterio_id" ON "sub_criterio" USING btree ("criterio_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_asignacion_evaluador_id" ON "asignacion_evaluador" USING btree ("evaluador_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_calificacion_evaluador_id" ON "calificacion" USING btree ("evaluador_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_notificacion_destinatario_id" ON "notificacion_email" USING btree ("destinatario_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_sesion_usuario_id" ON "sesion_refresh_token" USING btree ("usuario_id" int4_ops);
*/