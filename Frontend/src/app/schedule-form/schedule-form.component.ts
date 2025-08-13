import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SlackService, SlackChannel } from '../services/slack.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-schedule-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './schedule-form.component.html',
  styleUrls: ['./schedule-form.component.css']
})
export class ScheduleFormComponent implements OnInit {
  channels: SlackChannel[] = [];
  loadingChannels = true;
  submitting = false;

  successMsg = '';
  errorMsg = '';

  // timers for auto-dismiss
  private successTimer?: any;
  private errorTimer?: any;

  form!: FormGroup;

  constructor(private fb: FormBuilder, private slack: SlackService, private router: Router) {
    this.form = this.fb.group({
      channel: ['', Validators.required],
      text: ['', [Validators.required, Validators.maxLength(4000)]],
      send_at: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.slack.getChannels().subscribe({
      next: (chs) => { this.channels = chs; this.loadingChannels = false; },
      error: () => { this.setError('Failed to load channels'); this.loadingChannels = false; }
    });
  }

  submit(): void {
    this.clearAlerts();
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const { channel, text, send_at } = this.form.value;
    if (!channel || !text || !send_at) return;

    this.submitting = true;
    this.slack.scheduleMessage(channel, text, send_at).subscribe({
      next: () => {
        this.submitting = false;
        this.setSuccess('Message scheduled successfully.');
        this.form.patchValue({ text: '', send_at: '' });
      },
      error: () => {
        this.submitting = false;
        this.setError('Failed to schedule message.');
      }
    });
  }

  sendNow(): void {
    this.clearAlerts();
    const channel = this.form.get('channel')?.value;
    const text = this.form.get('text')?.value;
    if (!channel || !text) {
      this.setError('Please select a channel and enter a message.');
      return;
    }

    this.submitting = true;
    const nowIso = new Date().toISOString();
    this.slack.scheduleMessage(channel, text, nowIso).subscribe({
      next: () => {
        this.submitting = false;
        this.setSuccess('Message sent immediately.');
        this.form.patchValue({ text: '' });
      },
      error: () => {
        this.submitting = false;
        this.setError('Failed to send message.');
      }
    });
  }

  goToScheduled() {
    this.router.navigate(['/scheduled-messages']);
  }

  
  private setSuccess(msg: string) {
    this.successMsg = msg;
    if (this.successTimer) clearTimeout(this.successTimer);
    this.successTimer = setTimeout(() => { this.successMsg = ''; }, 5000);
  }

  private setError(msg: string) {
    this.errorMsg = msg;
    if (this.errorTimer) clearTimeout(this.errorTimer);
    this.errorTimer = setTimeout(() => { this.errorMsg = ''; }, 5000);
  }

  private clearAlerts() {
    this.successMsg = '';
    this.errorMsg = '';
    if (this.successTimer) { clearTimeout(this.successTimer); this.successTimer = undefined; }
    if (this.errorTimer) { clearTimeout(this.errorTimer); this.errorTimer = undefined; }
  }
}
