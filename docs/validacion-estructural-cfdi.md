# Validación estructural de CFDI XML

La página `/validar-cfdi-xml` valida CFDI 4.0 en el navegador con `xmllint-wasm`
y esquemas XSD oficiales. El XML seleccionado no se envía al servidor. En la
primera validación se descargan los esquemas necesarios; el navegador los guarda
en Cache Storage por siete días y luego los reutiliza.

El endpoint `GET /api/cfdi-xsd?url=...` solo entrega esquemas XSD alojados en
rutas permitidas del SAT o en un conjunto acotado de esquemas de W3C. Los
esquemas no se guardan en el repositorio ni en el servidor de la aplicación.

## Esquemas base

La aplicación consulta estos XSD base:

- [CFDI 4.0](https://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd)
- [Catálogos CFDI](https://www.sat.gob.mx/sitio_internet/cfd/catalogos/catCFDI.xsd)
- [Tipos de datos CFDI](https://www.sat.gob.mx/sitio_internet/cfd/tipoDatos/tdCFDI/tdCFDI.xsd)
- [Timbre Fiscal Digital 1.1](https://www.sat.gob.mx/sitio_internet/cfd/TimbreFiscalDigital/TimbreFiscalDigitalv11.xsd)

## Complementos

La herramienta lee las ubicaciones de esquema declaradas en
`xsi:schemaLocation`, resuelve los `import`/`include` de los XSD y agrega los
esquemas cargados al conjunto local de `xmllint-wasm`. Solo permite consultar
esquemas por HTTPS desde `www.sat.gob.mx`, `sat.gob.mx` y las rutas XSD W3C
explícitamente enumeradas en el endpoint.

Si falta un esquema, su ubicación no pertenece a las fuentes permitidas, el
espacio de nombres no coincide o se rebasa el límite de recursos, el resultado
se marca como **parcial** y se identifica lo que quedó sin verificar. No se
presenta una validación parcial como válida.

## Alcance

La herramienta revisa estructura y restricciones XSD. No verifica vigencia,
cancelación, firmas criptográficas ni reglas de negocio del SAT.
