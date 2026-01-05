import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'emailHide',
})
export class EmailHidePipe implements PipeTransform {
  transform(value: string, charactersToShow: number = 3): string {
    if (!value) return '';

    const atIndex = value.indexOf('@');
    if (atIndex === -1) return value;

    const username = value.slice(5, atIndex);

    const hiddenCharacters = '*'.repeat(
      Math.max(0, username.length - charactersToShow)
    );

    return hiddenCharacters + value.slice(username.length);
  }
}