import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {TranslateModule} from '@ngx-translate/core';
import {GameAutocompleteInputComponent} from './components/game-autocomplete-input/game-autocomplete-input.component';
import {TrackAutocompleteInputComponent} from './components/track-autocomplete-input/track-autocomplete-input.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    GameAutocompleteInputComponent,
    TrackAutocompleteInputComponent,
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    GameAutocompleteInputComponent,
    TrackAutocompleteInputComponent,
  ],
})
export class SharedModule {}
