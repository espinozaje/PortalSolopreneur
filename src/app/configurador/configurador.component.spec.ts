import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfiguradorComponent } from './configurador.component';

describe('ConfiguradorComponent', () => {
  let component: ConfiguradorComponent;
  let fixture: ComponentFixture<ConfiguradorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfiguradorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfiguradorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
