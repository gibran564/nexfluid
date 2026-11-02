import { useState } from 'react';
import { NexSheets, createWorkbook, sheetFromRows } from '@eclipsis/react/sheets';

const initial = createWorkbook([
  sheetFromRows('Presupuesto', [
    ['Partida', 'Previsto', 'Real', 'Diferencia'],
    ['Diseño', 1200, 1350, '=C2-B2'],
    ['Desarrollo', 4800, 4520, '=C3-B3'],
    ['Pruebas', 900, 1010, '=C4-B4'],
    ['Total', '=SUMA(B2:B4)', '=SUMA(C2:C4)', '=C5-B5'],
  ], { rows: 30, columns: 8 }),
]);

export default function SheetsBasic() {
  const [workbook, setWorkbook] = useState(initial);
  return <NexSheets workbook={workbook} onChange={setWorkbook} height={360} label="Presupuesto" />;
}
