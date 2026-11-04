import { NexSheets, createWorkbook, sheetFromRows } from '@eclipsis/react/sheets';

const workbook = createWorkbook([
  sheetFromRows('Lecturas', [['Sensor', 'Valor'], ['T1', 21.4], ['T2', 22.1], ['T3', 20.8], ['Media', '=PROMEDIO(B2:B4)']], { rows: 20, columns: 4 }),
]);

/** Las piezas sueltas dentro de su Provider: la composición es de la aplicación. */
export default function SheetsComposed() {
  return (
    <NexSheets.Provider defaultWorkbook={workbook}>
      <div className="nx-sheets" style={{ height: 300 }}>
        <NexSheets.FormulaBar />
        <div className="nx-sheets__body"><NexSheets.Grid label="Lecturas" /></div>
        <div className="nx-sheets__foot"><NexSheets.StatusBar /></div>
      </div>
    </NexSheets.Provider>
  );
}
