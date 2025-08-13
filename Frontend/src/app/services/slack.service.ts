import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


export interface SlackChannel {
  id: string;
  name: string;
  is_member: boolean;
}

export interface ScheduledMessage {
  id: number;
  channel: string;
  text: string;
  send_at: string;    
  created_at: string; 
  sent: number;      
}

@Injectable({
  providedIn: 'root'
})
export class SlackService {

  private backendUrl = 'https://localhost:4000';

  constructor(private http: HttpClient) {}

getChannels(): Observable<SlackChannel[]> {
  return this.http.get<SlackChannel[]>(`${this.backendUrl}/api/channels`);
}


  getScheduledMessages(): Observable<ScheduledMessage[]> {
    return this.http.get<ScheduledMessage[]>(`${this.backendUrl}/api/schedule`);
  }

  scheduleMessage(channel: string, text: string, sendAt: string): Observable<any> {
    return this.http.post(`${this.backendUrl}/api/schedule`, {
      channel,
      text,
      send_at: sendAt
    });
  }

  cancelScheduledMessage(id: number): Observable<any> {
    return this.http.delete(`${this.backendUrl}/api/schedule/${id}`);
  }
  
  getAuthUrl(): string {
  return 'https://localhost:4000/auth/slack';
}

sendNow(channel: string, text: string) {
  return this.http.post(`${this.backendUrl}/api/send`, { channel, text });
}
}


