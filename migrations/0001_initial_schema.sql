CREATE TABLE sidof_tipo_cambio (
  cod_nota INTEGER PRIMARY KEY,
  fecha_publicacion TEXT NOT NULL,
  fecha_tipo_cambio TEXT NOT NULL,
  usd_mxn TEXT NOT NULL,
  titulo TEXT NOT NULL,
  url_fuente TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fecha_tipo_cambio
  ON sidof_tipo_cambio (fecha_tipo_cambio);

CREATE TABLE sat_catalogos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clave TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  url_fuente TEXT NOT NULL,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sat_catalogo_errores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  catalogo_id INTEGER NOT NULL,
  num TEXT NOT NULL,
  elemento TEXT NOT NULL,
  atributo TEXT NOT NULL,
  validacion TEXT NOT NULL,
  codigo_error TEXT NOT NULL,
  descripcion_codigo_error TEXT NOT NULL,
  aclaraciones TEXT,
  FOREIGN KEY (catalogo_id) REFERENCES sat_catalogos (id) ON DELETE CASCADE
);

CREATE INDEX idx_sat_error_codigo
  ON sat_catalogo_errores (codigo_error);

CREATE INDEX idx_sat_error_catalogo_codigo
  ON sat_catalogo_errores (catalogo_id, codigo_error);
