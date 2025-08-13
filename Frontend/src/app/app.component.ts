import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet,CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  connected = false;

  ngOnInit() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'true') this.connected = true;
  }

  connectSlack() {
    const clientId = '9330713188228.9326175055861';
    const redirectUri = encodeURIComponent('https://localhost:4000/auth/slack/callback');
    const scope = encodeURIComponent('chat:write,channels:read,groups:read,im:read,mpim:read');
    window.location.href =
      `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scope}&redirect_uri=${redirectUri}`;
  }
}
