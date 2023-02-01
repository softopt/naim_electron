import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TraceLogComponent } from './trace-log.component';

describe('TraceLogComponent', () => {
  let component: TraceLogComponent;
  let fixture: ComponentFixture<TraceLogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TraceLogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TraceLogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
