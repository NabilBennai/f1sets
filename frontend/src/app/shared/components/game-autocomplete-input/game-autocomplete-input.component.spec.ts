import {fakeAsync, tick} from '@angular/core/testing';
import {TestBed} from '@angular/core/testing';
import {GameAutocompleteInputComponent} from './game-autocomplete-input.component';

describe('GameAutocompleteInputComponent', () => {
  let component: GameAutocompleteInputComponent;
  let onChangeSpy: jasmine.Spy;
  let onTouchedSpy: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new GameAutocompleteInputComponent());
    onChangeSpy = jasmine.createSpy('onChange');
    onTouchedSpy = jasmine.createSpy('onTouched');
    component.registerOnChange(onChangeSpy);
    component.registerOnTouched(onTouchedSpy);
  });

  it('maps code to label on writeValue', () => {
    component.writeValue('f12024');
    expect(component.value).toBe('EA SPORTS F1 24');
  });

  it('emits matched code on exact label input', () => {
    spyOn(component.valueChange, 'emit');

    component.handleInput('EA SPORTS F1 25');

    expect(onChangeSpy).toHaveBeenCalledWith('f12025');
    expect(component.valueChange.emit).toHaveBeenCalledWith('f12025');
  });

  it('clears value and notifies control', () => {
    spyOn(component.valueChange, 'emit');
    const event = new MouseEvent('click');
    spyOn(event, 'preventDefault');
    spyOn(event, 'stopPropagation');

    component.clearValue(event);

    expect(component.value).toBe('');
    expect(onChangeSpy).toHaveBeenCalledWith('');
    expect(component.valueChange.emit).toHaveBeenCalledWith('');
    expect(onTouchedSpy).toHaveBeenCalled();
  });

  it('closes dropdown and touches on blur', fakeAsync(() => {
    component.dropdownOpen = true;

    component.handleBlur();
    tick(120);

    expect(component.dropdownOpen).toBeFalse();
    expect(onTouchedSpy).toHaveBeenCalled();
  }));
});
