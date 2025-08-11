<h1>Slack Connect – Message Sender & Scheduler</h1>
<p> Full-stack app to connect a Slack workspace, send messages immediately, and schedule messages for future delivery.<br/> 
  <b>Frontend:</b> Angular (TypeScript) &nbsp;•&nbsp; <b>Backend:</b> Node.js + Express (TypeScript) &nbsp;•&nbsp; <b>DB:</b> SQLite </p> <hr/> 
  <h2>1) Setup &amp; Run Instructions</h2> 
  <h3>Prerequisites</h3> 
  <ul> <li>Node.js 18+ (works on 20+)</li> 
    <li>npm (or yarn)</li> <li>Git</li> 
    <li>Optional: <code>mkcert</code> for trusted local HTTPS certificates</li> </ul> <h3>Clone & Install</h3> 
    <pre><code># Clone git clone https://github.com/&lt;your-username&gt;/SlackScheduler.git cd SlackScheduler
Backend
cd Backend
npm install

Frontend
cd ../Frontend
npm install
</code></pre>

<h3>Environment Variables</h3> 
<p>Create <code>Backend/.env</code> using the provided <code>Backend/.env.example</code>:</p> <pre><code># Backend/.env SLACK_CLIENT_ID=your-slack-client-id SLACK_CLIENT_SECRET=your-slack-client-secret SLACK_REDIRECT_URI=https://localhost:4000/auth/slack/callback FRONTEND_URL=https://localhost:4200 PORT=4000 DB_PATH=./slack.db </code>
</pre>  
<h3>Local HTTPS (already wired)</h3> <ul> <li>Backend expects certs: <code>Backend/certs/key.pem</code> and 
    <code>Backend/certs/cert.pem</code></li> <li>Angular dev server is configured in <code>angular.json</code> to run with HTTPS and your certs</li> </ul> 
    <p>Generate quick self-signed certs (dev only):</p> <pre><code>cd Backend mkdir -p certs openssl req -nodes -new -x509 -keyout certs/key.pem -out certs/cert.pem -subj "/CN=localhost" </code></pre> 
    <p><i>Tip:</i> To avoid the browser “Not secure” warning in dev, use <code>mkcert</code> and point Angular/Backend to those certs.</p> 
    <h3>Run</h3> <pre><code># Terminal 1 — Backend cd Backend npm run dev # → https://localhost:4000
Terminal 2 — Frontend
cd Frontend
ng serve

→ https://localhost:4200
</code></pre>

<h3>Use</h3> 
<ol> 
  <li>Open <code>https://localhost:4200</code></li> 
  <li>Click <b>Connect to Slack</b> and authorize</li> 
  <li>Send a message immediately or schedule it for later</li>
  <li>View and cancel scheduled messages</li> </ol> <hr/> 
  <h2>2) Slack Configuration (OAuth, Redirect URI, Scopes)</h2> 
  <ol> <li>Go to <a href="https://api.slack.com/apps" target="_blank">api.slack.com/apps</a> → <b>Create New App</b> (From scratch).</li> <li><b>OAuth &amp; Permissions</b> →
    <b>Redirect URLs</b>: <ul><li>Add: <code>https://localhost:4000/auth/slack/callback</code></li></ul> </li> <li><b>OAuth &amp; Permissions</b> → <b>Scopes</b> 
      (Bot Token Scopes): <ul> <li><code>chat:write</code></li> <li><code>channels:read</code></li> <li><code>groups:read</code></li> 
        <li><code>im:read</code></li> <li><code>mpim:read</code></li> </ul> </li> <li><b>Advanced Token Security</b> (Token Rotation): Opt-in to token rotation (recommended). 
          Slack will issue <code>access_token</code>, <code>refresh_token</code>, and <code>expires_in</code>.
        </li> <li><b>Install App</b> to your workspace (or 
            <b>Reinstall</b> after changing token rotation).</li> <li><b>Basic Information</b>: <ul> <li>Copy <b>Client ID</b> and <b>Client Secret</b> → put them in <code>Backend/.env</code>.</li> 
            </ul> </li> </ol> <p><b>Multi-workspace installs?</b> If you want other workspaces to install your app, go to <b>Manage Distribution</b> and complete the distribution checklist. Otherwise, you may get 
              <code>invalid_team_for_non_distributed_app</code> when authorizing from a different workspace. You can also lock the authorize URL to your team using <code>&amp;team=Txxxxxx</code>.</p> <hr/> <h2>3) Architecture Overview</h2> <h3>3.1 OAuth Flow (Slack OAuth v2)</h3> <ol> <li><b>Start:</b> Frontend sends the user to <code>/auth/slack</code> (backend), which builds the Slack authorize URL with <code>client_id</code>, <code>scope</code>, and <code>redirect_uri</code>, and then redirects to Slack.</li> <li><b>Callback:</b> Slack redirects to
                <code>/auth/slack/callback</code> with a one-time 
                <code>code</code>.</li> <li><b>Exchange:</b> Backend <code>POST</code>s to
                <code>https://slack.com/api/oauth.v2.access</code> with <code>client_id</code>, <code>client_secret</code>, <code>code</code>, and <code>redirect_uri</code>.</li> 
                <li><b>Persist:</b> Slack responds with <code>access_token</code> 
                  (bot token), <code>refresh_token</code>, <code>expires_in</code>, and <code>token_type</code>. We store these in SQLite: <code>tokens(access_token, refresh_token, expires_at, token_type, created_at)</code>.</li> <li><b>Redirect:</b> Backend redirects the user back to <code>FRONTEND_URL</code> with <code>?connected=true</code>.</li> </ol> <h3>3.2 Token Refresh Logic</h3> <ul> 
                <li>All Slack API calls (send message, fetch channels, scheduler) request a token via <code>getValidBotToken()</code>.</li>
                <li><code>getValidBotToken()</code> checks the latest token row: <ul> 
                <li>If <code>expires_at</code> is still valid (with a small buffer), return 
                  <code>access_token</code>.</li> <li>Otherwise, it refreshes: <code>grant_type=refresh_token</code> → <code>oauth.v2.access</code> → stores the new tokens as a new row and returns the fresh <code>access_token</code>.</li> </ul> </li> <li>This ensures the backend is always using a valid bot token without user re-auth.</li> </ul>
                  <h3>3.3 Scheduler (Immediate &amp; Periodic)</h3> <ul> <li>When you schedule, the backend normalizes the provided local datetime to <b>UTC ISO</b> and inserts it into <code>scheduled_messages</code>.</li> 
                  <li><b>Immediate check:</b> Right after scheduling, the server triggers a one-off check to catch “near-future” jobs.</li> <li><b>Cron:</b> A <code>node-cron</code> job runs <b>every minute</b> to scan for due messages (<code>send_at &le; now</code> and <code>sent=0</code>), sends them to Slack, and marks <code>sent=1</code>.</li> 
                  <li>Token refresh is automatically respected since scheduler uses <code>getValidBotToken()</code>.</li> </ul> 
                <h3>3.4 Data Model</h3> <pre><code>tokens( id INTEGER PK, access_token TEXT NOT NULL, refresh_token TEXT, token_type TEXT, expires_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP )
scheduled_messages(
id INTEGER PK,
channel TEXT NOT NULL,
text TEXT NOT NULL,
send_at DATETIME NOT NULL, -- stored in UTC ISO format
sent INTEGER DEFAULT 0,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
</code></pre>

<h3>3.5 Frontend Flow</h3> <ul> <li>Connect → Redirect to Slack → Callback → Back to app with <code>?connected=true</code>.</li> <li>Compose: <ul> <li><b>Send Now</b>: POST <code>/api/send</code></li> <li><b>Schedule</b>: POST <code>/api/schedule</code> (with local datetime input)</li> </ul> </li> <li>Manage: <ul> <li>GET <code>/api/schedule</code> → table of scheduled (IST display)</li> <li>DELETE <code>/api/schedule/:id</code> → cancel before send time</li> </ul> </li> 
</ul> <hr/> <h2>4) Challenges &amp; Learnings</h2>
<ul> <li><b>OAuth &amp; Redirect parity (HTTPS):</b> Slack OAuth requires exact <code>redirect_uri</code> matching the scheme/host/port. We ran both backend and frontend on HTTPS locally to keep parity and avoid mixed-content/CORS headaches.</li> <li><b>Token Rotation:</b> After opting into Slack’s Advanced Token Security, tokens expire. Implementing a robust <code>getValidBotToken()</code> that refreshes and persists new tokens ensures uninterrupted service without user re-auth.</li> 
  <li><b>Timezones:</b> We accept local datetime input, normalize to <b>UTC</b> for storage, and format to <b>IST</b> for display. The scheduler compares in UTC to avoid drift.</li> <li><b>Reliability of Scheduling:</b> In addition to the minute cron, we trigger an immediate check after scheduling so near-future messages don't miss a window. Failures are logged and the job remains pending for retry on the next cycle.</li> 
  <li><b>Channel Membership:</b> Slack returns 
  <code>not_in_channel</code> if the bot isn’t invited. We surface the <code>is_member</code> flag and advise users to invite the bot with <code>/invite</code>.</li> <li><b>Local Certificates:</b> Self-signed certs produce browser warnings. Using <code>mkcert</code> creates locally trusted certs and smooths the auth experience in dev.</li> </ul> <hr/> <h2>Appendix: Quick API Tests (cURL)</h2> 
  <pre><code># Channels curl -k https://localhost:4000/api/channels # Send now curl -k -X POST https://localhost:4000/api/send \ -H 
    "Content-Type: application/json" \ -d '{"channel":"CXXXX","text":"Hello from cURL"}' # Schedule curl -k -X POST https://localhost:4000/api/schedule \ -H "Content-Type: application/json" \ -d '{"channel":"CXXXX","text":"Scheduled in 2 mins","send_at":"2025-08-12T14:30:00"}' # 
    List scheduled curl -k https://localhost:4000/api/schedule # Cancel scheduled curl -k -X DELETE https://localhost:4000/api/schedule/123 # Force refresh test curl -k -X POST https://localhost:4000/api/refresh-test </code></pre>
    
