import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { BulkComponent } from './bulk.component';

describe('BulkComponent', () => {
  let component: BulkComponent;
  let fixture: ComponentFixture<BulkComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BulkComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BulkComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
