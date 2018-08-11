//@flow

import type { HullEvent } from "hull";
import type { SegmentPayload } from "../types";

type SegmentEventPayload = {
  anonymousId?: string,
  event: HullEvent,
  userId?: string,
  groupId?: string,
  integrations: {},
  traits: {}
};

module.exports = function({
  anonymousId,
  event,
  userId,
  groupId,
  traits,
  integrations
}: SegmentEventPayload): SegmentPayload {
  const {
    created_at,
    event_id,
    anonymous_id,
    event: eventName,
    properties = {},
    context = {}
  } = event;
  const { name, category } = properties;

  const {
    location = {},
    page = {},
    referrer = {},
    os = {},
    useragent,
    ip = 0
  } = context;

  page.referrer = referrer.url;

  const payload = {
    anonymousId: anonymous_id || anonymousId,
    messageId: event_id,
    timestamp: new Date(created_at),
    userId,
    properties,
    integrations,
    context: {
      ip,
      groupId,
      os,
      page,
      traits,
      location,
      userAgent: useragent,
      active: true
    }
  };

  const type =
    eventName === "page" || eventName === "screen" ? eventName : "track";

  //Page-specific formatting
  if (type === "page") {
    const p = {
      ...page,
      ...properties
    };
    return {
      ...payload,
      name,
      channel: "browser",
      properties: {
        ...page,
        properties: p
      },
      context: {
        ...context,
        page: p
      }
    };
  }

  //Screen-specific formatting
  if (type === "screen") {
    return {
      ...payload,
      name,
      channel: "mobile",
      properties
    };
  }

  //Generic Track
  return {
    ...payload,
    event: eventName,
    category
  };
};
