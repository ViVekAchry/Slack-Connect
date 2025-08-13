import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScheduledMessagesComponent } from './scheduled-messages.component';

describe('ScheduledMessagesComponent', () => {
  let component: ScheduledMessagesComponent;
  let fixture: ComponentFixture<ScheduledMessagesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScheduledMessagesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScheduledMessagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
