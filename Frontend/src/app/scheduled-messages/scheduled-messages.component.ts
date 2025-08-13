import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';                 // 👈 add this
import { SlackService, ScheduledMessage } from '../services/slack.service';

@Component({
  selector: 'app-scheduled-messages',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scheduled-messages.component.html',
  styleUrls: ['./scheduled-messages.component.css']
})
export class ScheduledMessagesComponent implements OnInit {
  scheduledMessages: ScheduledMessage[] = [];
  loading = true;
  error: string | null = null;

  constructor(private slackService: SlackService, private router: Router) {}  // 👈 inject Router

  ngOnInit() {
    this.slackService.getScheduledMessages().subscribe({
      next: (messages) => { this.scheduledMessages = messages; this.loading = false; },
      error: () => { this.error = 'Failed to load scheduled messages'; this.loading = false; }
    });
  }

  cancelMessage(id: number) {
    if (!confirm('Are you sure you want to cancel this message?')) return;
    this.slackService.cancelScheduledMessage(id).subscribe({
      next: () => { this.scheduledMessages = this.scheduledMessages.filter(msg => msg.id !== id); },
      error: () => { alert('Failed to cancel message'); }
    });
  }

  goBack() {
    this.router.navigate(['/']);                           // 👈 back to schedule form
  }
}
