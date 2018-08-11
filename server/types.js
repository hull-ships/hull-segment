// @flow

import type {
  HullSegment,
  HullNotification,
  HullConnector,
  HullUserUpdateMessage,
  HullAccountUpdateMessage,
  HullClientConfiguration,
  HullAccountAttributes,
  HullAccountIdent,
  HullAccount,
  HullAttributeName,
  HullAttributeValue,
  HullAttributesChanges,
  HullEvent,
  HullObjectAttributes,
  HullObjectIdent,
  HullObject,
  HullReqContext,
  HullRequest,
  HullSegmentsChanges,
  HullUserAttributes,
  HullUserChanges,
  HullUserIdent,
  HullUser,
} from "hull";

/* Local Custom Types */

export type Transaction = {|
  action: "success" | "skip" | "error",
  message: string,
  id: string,
  type: "user" | "account",
  data: {}
|};

export type SegmentConnector = HullConnector & {
  settings: {
    write_key: string,
    ignore_segment_userId: boolean,
    public_id_field: "id" | "external_id" | "email",
    public_account_id_field: "id" | "external_id" | "domain",
    handle_pages: boolean,
    handle_screens: boolean,
    handle_accounts: boolean
  },
  private_settings: {
    synchronized_segments: Array<string>,
    synchronized_properties: Array<string>,
    synchronized_account_segments: Array<string>,
    synchronized_account_properties: Array<string>,
    forward_events: boolean,
    send_events: Array<string>
  }
};

export type SegmentContext = {
  ip?: string | number,
  groupId?: string,
  os?: {
    name?: string,
    version?: string
  },
  referrer?: {
    id?: string,
    type?: string
  },
  page?: {
    path?: string,
    referrer?: string,
    search?: string,
    title?: string,
    url?: string
  },
  traits?: {},
  userAgent?: string,
  active?: boolean
};


export type SegmentPayload = {
  userId?: string,
  groupId?: string,
  channel?: "mobile" | "browser",
  timestamp?: Date,
  integrations?: {},
  context?: SegmentContext,
  traits?: {},
  properties?: {}
};


export type SegmentEvent = {
  messageId: string,
  userId?: string,
  timestamp?: Date,
  integrations: {},
  context: SegmentContext
};
export type SegmentIdentify = SegmentEvent & {
  traits?: {
    [string]: HullAttributeValue
  }
};
export type SegmentGroup = SegmentEvent & {
  groupId: string,
  traits: {
    [string]: HullAttributeValue
  }
};
export type SegmentTrack = SegmentEvent & {
  anonymousId?: string,
  properties?: {
    [string]: HullAttributeValue
  }
};

export type SegmentClient = {
  track: SegmentPayload => void,
  page: SegmentPayload => void,
  enqueue: ("page" | "screen" | "track", SegmentPayload) => void,
  group: SegmentPayload => void,
  identify: SegmentPayload => void
};
export type SegmentClientFactory = string => SegmentClient;

export type StatusError = Error & {
  status?: number,
  message?: string,
}

export type NotificationCallbackResponse = void | Transaction
