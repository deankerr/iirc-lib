import type { EnricherCtx } from './types'

export const numerics300 = {
  // params: <client> <nick> :<message>
  RPL_AWAY: ({ req }: EnricherCtx) => ({
    client: req(),
    nick: req(),
    message: req(),
  }),

  // params: <client> :[<reply>{ <reply>}]
  RPL_USERHOST: ({ req }: EnricherCtx) => ({
    client: req(),
    replies: req(),
  }),

  // params: <client> :You are no longer marked as being away
  RPL_UNAWAY: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> :You have been marked as being away
  RPL_NOWAWAY: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> <nick> :has identified for this nick
  RPL_WHOISREGNICK: ({ req }: EnricherCtx) => ({
    client: req(),
    nick: req(),
    text: req(),
  }),

  // params: <client> <nick> <username> <host> * :<realname>
  RPL_WHOISUSER: ({ req }: EnricherCtx) => ({
    client: req(),
    nick: req(),
    username: req(),
    host: req(),
    realname: req(),
  }),

  // params: <client> <nick> <server> :<server info>
  RPL_WHOISSERVER: ({ req }: EnricherCtx) => ({
    client: req(),
    nick: req(),
    server: req(),
    serverInfo: req(),
  }),

  // params: <client> <nick> :is an IRC operator
  RPL_WHOISOPERATOR: ({ req }: EnricherCtx) => ({
    client: req(),
    nick: req(),
    text: req(),
  }),

  // params: <client> <nick> <username> <host> * :<realname>
  RPL_WHOWASUSER: ({ req }: EnricherCtx) => ({
    client: req(),
    nick: req(),
    username: req(),
    host: req(),
    realname: req(),
  }),

  // params: <client> <mask> :End of WHO list
  RPL_ENDOFWHO: ({ req }: EnricherCtx) => ({
    client: req(),
    mask: req(),
    text: req(),
  }),

  // params: <client> <nick> <secs> <signon> :seconds idle, signon time
  RPL_WHOISIDLE: ({ req }: EnricherCtx) => ({
    client: req(),
    nick: req(),
    secs: req(),
    signon: req(),
    text: req(),
  }),

  // params: <client> <nick> :End of /WHOIS list
  RPL_ENDOFWHOIS: ({ req }: EnricherCtx) => ({
    client: req(),
    nick: req(),
    text: req(),
  }),

  // params: <client> <nick> :blah blah blah
  RPL_WHOISSPECIAL: ({ req }: EnricherCtx) => ({
    client: req(),
    nick: req(),
    text: req(),
  }),

  // params: <client> <nick> :[prefix]<channel>{ [prefix]<channel>}
  RPL_WHOISCHANNELS: ({ req }: EnricherCtx) => ({
    client: req(),
    nick: req(),
    channels: req(),
  }),

  // params: <client> Channel :Users  Name
  RPL_LISTSTART: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> <channel> <client count> :<topic>
  RPL_LIST: ({ req }: EnricherCtx) => ({
    client: req(),
    channel: req(),
    clientCount: req(),
    topic: req(),
  }),

  // params: <client> :End of /LIST
  RPL_LISTEND: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> <channel> <creationtime>
  RPL_CREATIONTIME: ({ req }: EnricherCtx) => ({
    client: req(),
    channel: req(),
    creationtime: req(),
  }),

  // params: <client> <nick> <account> :is logged in as
  RPL_WHOISACCOUNT: ({ req }: EnricherCtx) => ({
    client: req(),
    nick: req(),
    account: req(),
    text: req(),
  }),

  // params: <client> <channel> :No topic is set
  RPL_NOTOPIC: ({ req }: EnricherCtx) => ({
    client: req(),
    channel: req(),
    text: req(),
  }),

  // params: <client> <channel>
  RPL_INVITELIST: ({ req }: EnricherCtx) => ({
    client: req(),
    channel: req(),
  }),

  // params: <client> :End of /INVITE list
  RPL_ENDOFINVITELIST: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> <nick> :is actually ...
  RPL_WHOISACTUALLY: ({ req }: EnricherCtx) => ({
    client: req(),
    nick: req(),
    text: req(),
  }),

  // params: <client> <nick> <channel>
  RPL_INVITING: ({ req }: EnricherCtx) => ({
    client: req(),
    nick: req(),
    channel: req(),
  }),

  // params: <client> <channel> <mask>
  RPL_INVEXLIST: ({ req }: EnricherCtx) => ({
    client: req(),
    channel: req(),
    mask: req(),
  }),

  // params: <client> <channel> :End of Channel Invite Exception List
  RPL_ENDOFINVEXLIST: ({ req }: EnricherCtx) => ({
    client: req(),
    channel: req(),
    text: req(),
  }),

  // params: <client> <channel> <mask>
  RPL_EXCEPTLIST: ({ req }: EnricherCtx) => ({
    client: req(),
    channel: req(),
    mask: req(),
  }),

  // params: <client> <channel> :End of channel exception list
  RPL_ENDOFEXCEPTLIST: ({ req }: EnricherCtx) => ({
    client: req(),
    channel: req(),
    text: req(),
  }),

  // params: <client> <version> <server> :<comments>
  RPL_VERSION: ({ req }: EnricherCtx) => ({
    client: req(),
    version: req(),
    server: req(),
    comments: req(),
  }),

  // params: <client> <channel> <username> <host> <server> <nick> <flags> :<hopcount> <realname>
  RPL_WHOREPLY: ({ req }: EnricherCtx) => ({
    client: req(),
    channel: req(),
    username: req(),
    host: req(),
    server: req(),
    nick: req(),
    flags: req(),
    text: req(),
  }),

  // params: <client> <server1> <server2> :<hopcount> <server info>
  RPL_LINKS: ({ req }: EnricherCtx) => ({
    client: req(),
    server1: req(),
    server2: req(),
    text: req(),
  }),

  // params: <client> * :End of /LINKS list
  RPL_ENDOFLINKS: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> <nick> :End of WHOWAS
  RPL_ENDOFWHOWAS: ({ req }: EnricherCtx) => ({
    client: req(),
    nick: req(),
    text: req(),
  }),

  // params: <client> :<string>
  RPL_INFO: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> :<line of the motd>
  RPL_MOTD: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> :End of INFO list
  RPL_ENDOFINFO: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> :- <server> Message of the day -
  RPL_MOTDSTART: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> :End of /MOTD command.
  RPL_ENDOFMOTD: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> <nick> :is connecting from *@localhost 127.0.0.1
  RPL_WHOISHOST: ({ req }: EnricherCtx) => ({
    client: req(),
    nick: req(),
    text: req(),
  }),

  // params: <client> <nick> :is using modes +ailosw
  RPL_WHOISMODES: ({ req }: EnricherCtx) => ({
    client: req(),
    nick: req(),
    text: req(),
  }),

  // params: <client> :You are now an IRC operator
  RPL_YOUREOPER: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> <config file> :Rehashing
  RPL_REHASHING: ({ req }: EnricherCtx) => ({
    client: req(),
    configFile: req(),
    text: req(),
  }),

  // params: <client> <channel> <modestring> <mode arguments>...
  RPL_CHANNELMODEIS: ({ req, rest }: EnricherCtx) => {
    const client = req()
    const channel = req()
    const modestring = req()
    return { client, channel, modestring, modeArgs: rest() }
  },

  // params: <client> <channel> :<topic>
  RPL_TOPIC: ({ req }: EnricherCtx) => ({
    client: req(),
    channel: req(),
    topic: req(),
  }),

  // params: <client> <channel> <nick> <setat>
  RPL_TOPICWHOTIME: ({ req }: EnricherCtx) => ({
    client: req(),
    channel: req(),
    nick: req(),
    setat: req(),
  }),

  // params: <client> <symbol> <channel> :[prefix]<nick>{ [prefix]<nick>}
  RPL_NAMREPLY: ({ req }: EnricherCtx) => ({
    client: req(),
    symbol: req(),
    channel: req(),
    names: req(),
  }),

  // params: <client> <channel> :<info>
  RPL_ENDOFNAMES: ({ req }: EnricherCtx) => ({
    client: req(),
    channel: req(),
  }),

  // params: <client> <channel> <mask> [<who> <set-ts>]
  RPL_BANLIST: ({ req, rest }: EnricherCtx) => {
    const client = req()
    const channel = req()
    const mask = req()
    const r = rest()
    return {
      client,
      channel,
      mask,
      who: r[0],
      setTs: r[1],
    }
  },

  // params: <client> <server> [<timestamp> [<TS offset>]] :<human-readable time>
  RPL_TIME: ({ req, rest }: EnricherCtx) => {
    const client = req()
    const server = req()
    const r = rest()
    return {
      client,
      server,
      timestamp: r.length > 1 ? r[0] : undefined,
      tsOffset: r.length > 2 ? r[1] : undefined,
      time: r.at(-1),
    }
  },
}
