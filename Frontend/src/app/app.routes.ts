// import { Routes } from '@angular/router';
// import { ScheduledMessagesComponent } from './scheduled-messages/scheduled-messages.component';
// import { ScheduleFormComponent } from './schedule-form/schedule-form.component';

// export const routes: Routes = [
//   { path: '', redirectTo: 'scheduled', pathMatch: 'full' },
//   { path: 'scheduled', component: ScheduledMessagesComponent },
//   { path: 'new', component: ScheduleFormComponent }
// ];
//////////////
import { Routes } from '@angular/router';
import { ScheduleFormComponent } from './schedule-form/schedule-form.component';
import { ScheduledMessagesComponent } from './scheduled-messages/scheduled-messages.component';

export const routes: Routes = [
  { path: '', component: ScheduleFormComponent },               // form page (home)
  { path: 'scheduled-messages', component: ScheduledMessagesComponent },
  { path: '**', redirectTo: '' }
];
