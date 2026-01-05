import { Pipe, PipeTransform } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';

@Pipe({
  name: 'filtroCuerpoColegiado',
})
export class FiltroCuerpoColegiadoPipe implements PipeTransform {
  transform(
    dataSource: MatTableDataSource<any>,
    key: string,
    searchText: string
  ): MatTableDataSource<any> {
    if (!dataSource || !dataSource.data || !searchText) {
      return dataSource;
    }

    searchText = searchText.toLowerCase();
    const filteredData = dataSource.data.filter((item) => {
      const itemValue = item[key];
      return itemValue && itemValue.toLowerCase().includes(searchText);
    });

    return new MatTableDataSource(filteredData);
  }
}
