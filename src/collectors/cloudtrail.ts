import { LookupEventsCommand } from "@aws-sdk/client-cloudtrail";
import type { CloudTrailClient, Event } from "@aws-sdk/client-cloudtrail";

export interface RawTrailEvent {
  eventTime: Date;
  eventSource: string;
  eventName: string;
  username: string;
  principalArn: string;
  resources: Array<{ resourceType: string; resourceName: string }>;
  errorCode?: string;
  errorMessage?: string;
  cloudTrailEvent: Record<string, unknown>;
}

export async function collectCloudTrailEvents(
  client: CloudTrailClient,
  since: Date,
): Promise<RawTrailEvent[]> {
  const events: RawTrailEvent[] = [];
  let nextToken: string | undefined;

  // Fetch up to 3 pages (150 events) to avoid excessive API calls
  for (let page = 0; page < 3; page++) {
    const result = await client
      .send(
        new LookupEventsCommand({
          StartTime: since,
          EndTime: new Date(),
          MaxResults: 50,
          ...(nextToken ? { NextToken: nextToken } : {}),
        }),
      )
      .catch(() => ({ Events: [] as Event[], NextToken: undefined }));

    for (const event of result.Events ?? []) {
      let parsed: Record<string, unknown> = {};
      if (event.CloudTrailEvent) {
        try {
          parsed = JSON.parse(event.CloudTrailEvent);
        } catch {
          // ignore
        }
      }

      events.push({
        eventTime: event.EventTime ?? new Date(),
        eventSource: event.EventSource ?? "",
        eventName: event.EventName ?? "",
        username: event.Username ?? "",
        principalArn: (parsed.userIdentity as Record<string, string>)?.arn ?? "",
        resources: (event.Resources ?? []).map((r) => ({
          resourceType: r.ResourceType ?? "",
          resourceName: r.ResourceName ?? "",
        })),
        errorCode: (parsed.errorCode as string) ?? undefined,
        errorMessage: (parsed.errorMessage as string) ?? undefined,
        cloudTrailEvent: parsed,
      });
    }

    nextToken = result.NextToken;
    if (!nextToken) break;
  }

  return events;
}
