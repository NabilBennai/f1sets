import {fakeAsync, tick} from '@angular/core/testing';
import {TestBed} from '@angular/core/testing';
import {TrackAutocompleteInputComponent} from './track-autocomplete-input.component';

describe('TrackAutocompleteInputComponent', () => {
  let component: TrackAutocompleteInputComponent;
  let onChangeSpy: jasmine.Spy;
  let onTouchedSpy: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new TrackAutocompleteInputComponent());
    (component as {options: () => Array<{slug: string; label: string}>}).options = () => [
      {slug: 'monza', label: 'Monza'},
      {slug: 'silverstone', label: 'Silverstone'},
    ];
    onChangeSpy = jasmine.createSpy('onChange');
    onTouchedSpy = jasmine.createSpy('onTouched');
    component.registerOnChange(onChangeSpy);
    component.registerOnTouched(onTouchedSpy);
  });

  it('maps slug to label on writeValue', () => {
    component.writeValue('monza');
    expect(component.value).toBe('Monza');
  });

  it('selectOption emits slug and closes dropdown', () => {
    spyOn(component.valueChange, 'emit');
    component.dropdownOpen = true;

    component.selectOption('silverstone');

    expect(component.value).toBe('Silverstone');
    expect(component.dropdownOpen).toBeFalse();
    expect(onChangeSpy).toHaveBeenCalledWith('silverstone');
    expect(component.valueChange.emit).toHaveBeenCalledWith('silverstone');
    expect(onTouchedSpy).toHaveBeenCalled();
  });

  it('handleInput emits normalized free text when no exact match', () => {
    spyOn(component.valueChange, 'emit');

    component.handleInput('  custom-track  ');

    expect(onChangeSpy).toHaveBeenCalledWith('custom-track');
    expect(component.valueChange.emit).toHaveBeenCalledWith('custom-track');
    expect(component.dropdownOpen).toBeTrue();
  });

  it('handleBlur closes menu and touches control', fakeAsync(() => {
    component.dropdownOpen = true;

    component.handleBlur();
    tick(120);

    expect(component.dropdownOpen).toBeFalse();
    expect(onTouchedSpy).toHaveBeenCalled();
  }));
});
