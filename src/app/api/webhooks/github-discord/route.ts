import { NextRequest, NextResponse } from 'next/server';

const DISCORD_WEBHOOK_URL = process.env.DISCORD_GITHUB_WEBHOOK_URL;

interface GitHubCommit {
  id: string;
  message: string;
  author: {
    name: string;
    username: string;
  };
  url: string;
  added: string[];
  modified: string[];
  removed: string[];
}

interface GitHubPushEvent {
  ref: string;
  repository: {
    name: string;
    full_name: string;
    html_url: string;
  };
  pusher: {
    name: string;
  };
  commits: GitHubCommit[];
  compare: string;
}

/**
 * GitHub to Discord Webhook Translator
 *
 * This endpoint receives GitHub push events and forwards them to Discord
 * in the proper format. Configure this as your GitHub webhook URL instead
 * of pointing directly to Discord.
 */
export async function POST(request: NextRequest) {
  try {
    if (!DISCORD_WEBHOOK_URL) {
      console.error('DISCORD_GITHUB_WEBHOOK_URL not configured');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    const githubEvent = request.headers.get('x-github-event');

    // Only handle push events
    if (githubEvent !== 'push') {
      return NextResponse.json({ message: 'Event type not supported' }, { status: 200 });
    }

    const payload: GitHubPushEvent = await request.json();

    // Extract branch name from ref (refs/heads/main -> main)
    const branch = payload.ref.split('/').pop() || 'unknown';

    // Format commits for Discord
    const commitMessages = payload.commits.slice(0, 5).map((commit) => {
      const shortId = commit.id.substring(0, 7);
      const message = commit.message.split('\n')[0]; // First line only
      const filesChanged = commit.added.length + commit.modified.length + commit.removed.length;
      return `[\`${shortId}\`](${commit.url}) ${message} - *${filesChanged} file${filesChanged !== 1 ? 's' : ''}*`;
    }).join('\n');

    const totalCommits = payload.commits.length;
    const moreCommits = totalCommits > 5 ? `\n*...and ${totalCommits - 5} more commit${totalCommits - 5 !== 1 ? 's' : ''}*` : '';

    // Build Discord message
    const discordPayload = {
      embeds: [{
        title: `📝 New ${totalCommits} commit${totalCommits !== 1 ? 's' : ''} to \`${branch}\``,
        description: `${commitMessages}${moreCommits}`,
        color: 0x7289DA, // Discord blue
        author: {
          name: payload.pusher.name,
          icon_url: `https://github.com/${payload.pusher.name}.png`,
        },
        footer: {
          text: payload.repository.full_name,
        },
        timestamp: new Date().toISOString(),
        url: payload.compare,
      }],
    };

    // Forward to Discord
    const discordResponse = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(discordPayload),
    });

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text();
      console.error('Discord webhook failed:', discordResponse.status, errorText);
      return NextResponse.json(
        { error: 'Failed to send to Discord', details: errorText },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, commits: totalCommits });

  } catch (error) {
    console.error('GitHub-Discord webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    configured: !!DISCORD_WEBHOOK_URL,
    message: 'GitHub to Discord webhook translator'
  });
}
