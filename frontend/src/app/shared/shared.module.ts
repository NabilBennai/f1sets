import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {GameAutocompleteInputComponent} from './components/game-autocomplete-input/game-autocomplete-input.component';
import {TrackAutocompleteInputComponent} from './components/track-autocomplete-input/track-autocomplete-input.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    GameAutocompleteInputComponent,
    TrackAutocompleteInputComponent,
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    GameAutocompleteInputComponent,
    TrackAutocompleteInputComponent,
  ],
})
export class SharedModule {}
