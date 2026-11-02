import type { NexConsoleStatus, NexConsoleTextOutput } from './types.ts';

export interface NexViewDiagnostic {
  severity: 'error' | 'warning' | 'info' | 'interrupted';
  category: 'code' | 'dependency' | 'resource' | 'platform' | 'runtime';
  title: string;
  explanation?: string;
  action?: string;
  type?: string;
  location?: { file: string; line: number };
  suggestions: string[];
  original: string;
}

type Entry = [title: string, action: string, category?: NexViewDiagnostic['category']];
/** Language-specific catalogue, independent of the renderer and runtime lifecycle. */
const PYTHON: Record<string, Entry> = {
  SyntaxError: ['Python no pudo interpretar esta instrucción.', 'Revisa la sintaxis señalada.'],
  IndentationError: ['La sangría no corresponde con el bloque.', 'Alinea las instrucciones del mismo nivel.'],
  TabError: ['Se mezclaron tabulaciones y espacios.', 'Utiliza una indentación consistente.'],
  NameError: ['No encontramos la variable o función indicada.', 'Comprueba el nombre o ejecuta primero el bloque donde se define.'],
  UnboundLocalError: ['Esta variable local todavía no tiene un valor asignado.', 'Revisa el orden de asignación dentro de la función.'],
  TypeError: ['Esta operación no funciona con los tipos utilizados.', 'Consulta los tipos con type().'],
  ValueError: ['El valor proporcionado no es válido para esta operación.', 'Revisa el formato o rango esperado.'],
  AttributeError: ['Este objeto no tiene la propiedad o función solicitada.', 'Comprueba su tipo y sus métodos.'],
  ZeroDivisionError: ['No puedes dividir entre cero.', 'Comprueba el valor del divisor.'],
  OverflowError: ['El resultado supera los límites numéricos admitidos.', 'Revisa la magnitud de los operandos.'],
  FloatingPointError: ['Se detectó un problema en una operación numérica.', 'Comprueba los valores y la configuración numérica.'],
  ArithmeticError: ['La operación matemática no pudo completarse.', 'Examina los operandos.'],
  IndexError: ['Esa posición está fuera de la colección.', 'Consulta su tamaño con len().'],
  KeyError: ['No encontramos esa clave.', 'Consulta las claves disponibles con .keys().'],
  LookupError: ['No encontramos el elemento solicitado.', 'Comprueba el índice o la clave.'],
  StopIteration: ['El iterador no tiene más elementos.', 'Comprueba si quedan valores disponibles.'],
  RecursionError: ['La función realizó demasiadas llamadas recursivas.', 'Revisa el caso base y cuándo termina la recursión.'],
  MemoryError: ['La operación requiere más memoria de la disponible.', 'Trabaja con lotes más pequeños.', 'platform'],
  ModuleNotFoundError: ['No encontramos la biblioteca solicitada.', 'Comprueba su disponibilidad y compatibilidad en Paquetes.', 'dependency'],
  ImportError: ['No pudimos importar el componente indicado.', 'Revisa el nombre y la versión de la biblioteca.', 'dependency'],
  PermissionError: ['Este recurso no permite la operación solicitada.', 'Comprueba los permisos disponibles.', 'resource'],
  FileNotFoundError: ['No encontramos el archivo solicitado.', 'Comprueba la ruta o añádelo al proyecto.', 'resource'],
  FileExistsError: ['Ya existe un archivo en esa ruta.', 'Elige otro nombre o comprueba el archivo existente.', 'resource'],
  IsADirectoryError: ['Seleccionaste una carpeta donde se esperaba un archivo.', 'Indica la ruta del archivo correcto.', 'resource'],
  NotADirectoryError: ['Una parte de la ruta no corresponde a una carpeta.', 'Revisa la ruta.', 'resource'],
  OSError: ['No se pudo completar la operación del sistema.', 'Consulta el detalle técnico; algunas operaciones no están disponibles en el navegador.', 'platform'],
  UnicodeDecodeError: ['No pudimos interpretar la codificación del archivo.', 'Comprueba si utiliza UTF-8 u otra codificación.', 'resource'],
  UnicodeEncodeError: ['No pudimos representar el texto con esa codificación.', 'Utiliza una codificación que admita esos caracteres, como UTF-8.', 'resource'],
  JSONDecodeError: ['No pudimos interpretar el documento JSON.', 'Revisa las comillas, separadores y la ubicación indicada.', 'resource'],
  EmptyDataError: ['El archivo no contiene datos legibles.', 'Comprueba el contenido y el formato del archivo.', 'resource'],
  ParserError: ['No pudimos interpretar la estructura del archivo.', 'Revisa los separadores y las filas del dataset.', 'resource'],
  MergeError: ['No pudimos combinar estas tablas.', 'Comprueba las claves, los tipos y la cardinalidad del merge.'],
  OutOfBoundsDatetime: ['La fecha está fuera del rango admitido.', 'Revisa las fechas y la precisión temporal utilizada.'],
  LinAlgError: ['La operación de álgebra lineal no pudo completarse.', 'Comprueba la forma y si la matriz es singular.'],
  TimeoutError: ['La operación superó el tiempo permitido.', 'Comprueba qué está retrasando la ejecución.', 'runtime'],
  ReadTimeout: ['La lectura superó el tiempo permitido.', 'Comprueba la conexión y el tiempo de espera.', 'resource'],
  ConnectTimeout: ['La conexión superó el tiempo permitido.', 'Comprueba la dirección y la conexión.', 'resource'],
  ConnectionError: ['No pudimos completar la conexión.', 'Comprueba la conexión y la disponibilidad del servicio.', 'resource'],
  ConnectionRefusedError: ['El servicio rechazó la conexión.', 'Comprueba la dirección y si el servicio está disponible.', 'resource'],
  ConnectionResetError: ['La conexión se cerró inesperadamente.', 'Comprueba el servicio y vuelve a intentarlo.', 'resource'],
  BrokenPipeError: ['El canal de comunicación se cerró.', 'Comprueba el destino antes de volver a escribir.', 'resource'],
  EOFError: ['La entrada terminó antes de recibir un valor.', 'Proporciona la entrada que espera input().'],
  KeyboardInterrupt: ['La ejecución fue interrumpida.', 'Puedes volver a iniciarla.', 'runtime'],
  RuntimeError: ['La operación encontró un problema durante su ejecución.', 'Revisa el detalle técnico.'],
  NotImplementedError: ['Esta operación todavía no está implementada.', 'Busca una alternativa disponible.'],
  AssertionError: ['No se cumplió la condición esperada.', 'Comprueba los valores de la condición.'],
  SystemExit: ['El programa solicitó terminar.', 'Revisa el código de salida.', 'runtime'],
  DtypeWarning: ['Algunas columnas contienen tipos mezclados.', 'Comprueba los tipos y especifica dtype al leer los datos.'],
  ImportWarning: ['La importación produjo una advertencia.', 'Revisa la biblioteca y su versión.', 'dependency'],
  DeprecationWarning: ['Esta función está quedando en desuso.', 'Consulta la alternativa indicada en el detalle técnico.'],
  FutureWarning: ['Este comportamiento cambiará en una versión futura.', 'Revisa la alternativa indicada por la biblioteca.'],
  RuntimeWarning: ['La operación produjo una advertencia numérica.', 'Comprueba los valores y posibles NaN o infinitos.'],
  UserWarning: ['La biblioteca emitió una advertencia.', 'Revisa el mensaje original antes de continuar.'],
};

const RUNTIME: Record<string, Entry> = {
  RUNTIME_NOT_READY: ['El entorno todavía se está preparando.', 'Espera a que esté listo y vuelve a ejecutar.', 'runtime'],
  PACKAGE_INSTALL_FAILED: ['No pudimos preparar la biblioteca.', 'Revisa su disponibilidad y la conexión en Paquetes.', 'dependency'],
  UNSUPPORTED_PACKAGE: ['La biblioteca no es compatible con este entorno.', 'Busca una alternativa compatible con Python en el navegador.', 'dependency'],
  RESOURCE_NOT_FOUND: ['No encontramos el recurso solicitado.', 'Comprueba que el recurso siga disponible.', 'resource'],
  EXECUTION_CANCELLED: ['La ejecución fue cancelada.', 'Puedes volver a iniciarla.', 'runtime'],
  RUNTIME_CRASHED: ['El motor dejó de responder.', 'Reinicia el entorno y ejecuta los bloques que definen tus variables.', 'runtime'],
};

export function pythonLocation(text: string): NexViewDiagnostic['location'] {
  let found: NexViewDiagnostic['location'];
  for (const match of text.matchAll(/File "([^"\n]+)", line (\d+)/g)) {
    if (['<exec>', '<string>'].includes(match[1]!) || match[1]!.startsWith('/workspace/')) {
      found = { file: match[1]!, line: Number(match[2]) };
    }
  }
  if (!found) {
    const warning = text.match(/(?:^|\n)(<exec>|<string>|\/workspace\/[^:\n]+):(\d+):\s*\w+Warning:/);
    if (warning) found = { file: warning[1]!, line: Number(warning[2]) };
  }
  return found;
}

export function diagnoseOutput(output: NexConsoleTextOutput, status: NexConsoleStatus): NexViewDiagnostic | null {
  if (output.stream === 'stdout') return null;
  const original = output.text;
  const base = { original, suggestions: [] as string[], location: pythonLocation(original) };
  if (status === 'stopped' && (output.stream === 'error' || /^(Detuviste la ejecución\.|La ejecución se detuvo:)/.test(original.trim()))) return { ...base, severity: 'interrupted', category: 'runtime', title: 'La ejecución fue interrumpida.', action: 'Puedes volver a iniciarla.' };

  if (status === 'timeout' && /^La ejecución superó el límite/.test(original.trim())) return { ...base, severity: 'error', category: 'runtime', title: 'Se alcanzó el límite de tiempo de ejecución.', action: 'Revisa bucles y operaciones lentas antes de volver a ejecutar.' };

  const runtimeCode = original.match(/\b(RUNTIME_NOT_READY|PACKAGE_INSTALL_FAILED|UNSUPPORTED_PACKAGE|RESOURCE_NOT_FOUND|EXECUTION_CANCELLED|RUNTIME_CRASHED)\b/)?.[1];
  if (runtimeCode && output.stream === 'error') {
    const [title, action, category = 'runtime'] = RUNTIME[runtimeCode]!;
    return { ...base, title, action, category, type: runtimeCode, severity: runtimeCode === 'EXECUTION_CANCELLED' ? 'interrupted' : runtimeCode === 'RUNTIME_NOT_READY' ? 'info' : 'error' };
  }
  // The last exception is the final cause in chained tracebacks. Warning lines
  // can also carry a filename and line, without making the run fatal.
  const matches = [...original.matchAll(/(?:^|\n)(?:[^\n]*?:\d+:\s*)?(?:[\w.]+\.)?([A-Za-z]\w*(?:Error|Warning)|StopIteration|KeyboardInterrupt|SystemExit|ReadTimeout|ConnectTimeout)(?::\s*([^\n]*))?(?=\n|$)/g)];
  const match = matches.at(-1);
  if (!match) {
    if (output.stream !== 'error') return null;
    // Existing runtime messages are prose, not invented lifecycle codes.
    const infrastructure = status === 'rejected';
    let action: string | undefined;
    if (/No se pudieron preparar los paquetes.*a tiempo/i.test(original)) action = 'Revisa tu conexión y vuelve a ejecutar; el código no llegó a correr.';
    else if (/No se pudo inicializar el módulo interno/i.test(original)) action = 'Comprueba los recursos del proyecto y vuelve a ejecutar.';
    else if (/ejecución.*(?:curso|simult|concurr)/i.test(original)) action = 'Espera a que termine el bloque activo.';
    return { ...base, severity: 'error', category: infrastructure ? 'runtime' : 'code', title: original.trim().split('\n')[0]?.slice(0, 200) || 'El bloque no pudo completarse.', action };
  }
  const type = match[1]!;
  const message = match[2] ?? '';
  const warning = type.endsWith('Warning');
  if (output.stream === 'stderr' && (!warning || !PYTHON[type] || !/(?:^|\n)[^\n]+:\d+:\s*(?:[\w.]+\.)?\w+Warning:/.test(original))) return null;
  const [defaultTitle, defaultAction, category = 'code'] = PYTHON[type] ?? [type, 'Consulta el mensaje original.'];
  let title = defaultTitle;
  let action = defaultAction;
  let identifier: string | undefined;
  const context = output.context;
  if (type === 'NameError') identifier = message.match(/name ['"]([^'"\n]+)['"] is not defined/)?.[1];
  if (type === 'UnboundLocalError') identifier = message.match(/local variable ['"]([^'"\n]+)['"]/)?.[1];
  if (type === 'AttributeError') identifier = message.match(/has no attribute ['"]([^'"\n]+)['"]/)?.[1];
  if (type === 'KeyError') identifier = message.match(/^['"]([^'"\n]+)['"]$/)?.[1];
  if (identifier) {
    if (type === 'NameError') title = `No encontramos «${identifier}».`;
    if (type === 'UnboundLocalError') title = `La variable local «${identifier}» todavía no tiene un valor asignado.`;
    if (type === 'AttributeError') title = `Este objeto no tiene el atributo «${identifier}».`;
    if (type === 'KeyError') title = context?.target === 'column' && context.identifier === identifier ? `No encontramos la columna «${identifier}».` : `No encontramos la clave «${identifier}».`;
  }
  const interpreter = message.match(/Did you mean:\s*['"]([^'"\n]+)['"]\??/)?.[1];
  const suggestions = interpreter ? [interpreter] : identifier && context?.identifier === identifier ? context.suggestions.slice(0, 3) : [];
  if (context?.target === 'column' && type === 'KeyError') action = 'Revisa los nombres disponibles en df.columns.';
  if (type === 'SyntaxError' && /was never closed|unexpected EOF|incomplete input|unterminated/.test(message)) {
    title = 'Parece que dejaste una instrucción sin terminar.'; action = 'Comprueba delimitadores, comillas y expresiones pendientes.';
  }
  if (['ValueError', 'TypeError'].includes(type) && /broadcast|shapes?.*(?:align|match)|dimension|size mismatch|shape mismatch/i.test(message)) {
    title = 'Las dimensiones de los datos no permiten esta operación.'; action = 'Consulta .shape y comprueba las dimensiones de los operandos.';
  } else if (['ValueError', 'LinAlgError'].includes(type) && /NaN|infinity|infinities|infs|finite/i.test(message)) {
    title = 'Esta operación no admite valores NaN o infinitos.'; action = 'Localiza los valores no finitos antes de repetir la operación.';
  }
  if (type === 'ModuleNotFoundError') {
    const moduleName = message.match(/No module named ['"]([^'"\n]+)['"]/)?.[1];
    if (moduleName) title = `No encontramos la biblioteca «${moduleName}».`;
  }
  return { ...base, type, title, action, category, suggestions,
    severity: warning ? 'warning' : type === 'KeyboardInterrupt' ? 'interrupted' : type === 'SystemExit' ? 'info' : 'error',
    explanation: !PYTHON[type] ? message : undefined };
}
