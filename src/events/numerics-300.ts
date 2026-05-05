import type { EnricherCtx } from './types'

export const numerics300 = {
  // params: <client> <nick> :<message>
  RPL_AWAY: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    nick: param(),
    message: trailing(),
  }),

  // params: <client> :[<reply>{ <reply>}]
  RPL_USERHOST: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    replies: trailing(),
  }),

  // params: <client> :You are no longer marked as being away
  RPL_UNAWAY: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> :You have been marked as being away
  RPL_NOWAWAY: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> <nick> :has identified for this nick
  RPL_WHOISREGNICK: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    nick: param(),
    text: trailing(),
  }),

  // params: <client> <nick> <username> <host> * :<realname>
  RPL_WHOISUSER: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    nick: param(),
    username: param(),
    host: param(),
    realname: trailing(),
  }),

  // params: <client> <nick> <server> :<server info>
  RPL_WHOISSERVER: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    nick: param(),
    server: param(),
    serverInfo: trailing(),
  }),

  // params: <client> <nick> :is an IRC operator
  RPL_WHOISOPERATOR: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    nick: param(),
    text: trailing(),
  }),

  // params: <client> <nick> <username> <host> * :<realname>
  RPL_WHOWASUSER: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    nick: param(),
    username: param(),
    host: param(),
    realname: trailing(),
  }),

  // params: <client> <mask> :End of WHO list
  RPL_ENDOFWHO: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    mask: param(),
    text: trailing(),
  }),

  // params: <client> <nick> <secs> <signon> :seconds idle, signon time
  RPL_WHOISIDLE: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    nick: param(),
    secs: param(),
    signon: param(),
    text: trailing(),
  }),

  // params: <client> <nick> :End of /WHOIS list
  RPL_ENDOFWHOIS: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    nick: param(),
    text: trailing(),
  }),

  // params: <client> <nick> :blah blah blah
  RPL_WHOISSPECIAL: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    nick: param(),
    text: trailing(),
  }),

  // params: <client> <nick> :[prefix]<channel>{ [prefix]<channel>}
  RPL_WHOISCHANNELS: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    nick: param(),
    channels: trailing(),
  }),

  // params: <client> Channel :Users  Name
  RPL_LISTSTART: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> <channel> <client count> :<topic>
  RPL_LIST: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    channel: param(),
    clientCount: param(),
    topic: trailing(),
  }),

  // params: <client> :End of /LIST
  RPL_LISTEND: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> <channel> <creationtime>
  RPL_CREATIONTIME: ({ param }: EnricherCtx) => ({
    client: param(),
    channel: param(),
    creationtime: param(),
  }),

  // params: <client> <nick> <account> :is logged in as
  RPL_WHOISACCOUNT: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    nick: param(),
    account: param(),
    text: trailing(),
  }),

  // params: <client> <channel> :No topic is set
  RPL_NOTOPIC: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    channel: param(),
    text: trailing(),
  }),

  // params: <client> <channel>
  RPL_INVITELIST: ({ param }: EnricherCtx) => ({
    client: param(),
    channel: param(),
  }),

  // params: <client> :End of /INVITE list
  RPL_ENDOFINVITELIST: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> <nick> :is actually ...
  RPL_WHOISACTUALLY: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    nick: param(),
    text: trailing(),
  }),

  // params: <client> <nick> <channel>
  RPL_INVITING: ({ param }: EnricherCtx) => ({
    client: param(),
    nick: param(),
    channel: param(),
  }),

  // params: <client> <channel> <mask>
  RPL_INVEXLIST: ({ param }: EnricherCtx) => ({
    client: param(),
    channel: param(),
    mask: param(),
  }),

  // params: <client> <channel> :End of Channel Invite Exception List
  RPL_ENDOFINVEXLIST: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    channel: param(),
    text: trailing(),
  }),

  // params: <client> <channel> <mask>
  RPL_EXCEPTLIST: ({ param }: EnricherCtx) => ({
    client: param(),
    channel: param(),
    mask: param(),
  }),

  // params: <client> <channel> :End of channel exception list
  RPL_ENDOFEXCEPTLIST: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    channel: param(),
    text: trailing(),
  }),

  // params: <client> <version> <server> :<comments>
  RPL_VERSION: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    version: param(),
    server: param(),
    comments: trailing(),
  }),

  // params: <client> <channel> <username> <host> <server> <nick> <flags> :<hopcount> <realname>
  RPL_WHOREPLY: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    channel: param(),
    username: param(),
    host: param(),
    server: param(),
    nick: param(),
    flags: param(),
    text: trailing(),
  }),

  // params: <client> <server1> <server2> :<hopcount> <server info>
  RPL_LINKS: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    server1: param(),
    server2: param(),
    text: trailing(),
  }),

  // params: <client> * :End of /LINKS list
  RPL_ENDOFLINKS: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> <nick> :End of WHOWAS
  RPL_ENDOFWHOWAS: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    nick: param(),
    text: trailing(),
  }),

  // params: <client> :<string>
  RPL_INFO: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> :<line of the motd>
  RPL_MOTD: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> :End of INFO list
  RPL_ENDOFINFO: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> :- <server> Message of the day -
  RPL_MOTDSTART: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> :End of /MOTD command.
  RPL_ENDOFMOTD: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> <nick> :is connecting from *@localhost 127.0.0.1
  RPL_WHOISHOST: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    nick: param(),
    text: trailing(),
  }),

  // params: <client> <nick> :is using modes +ailosw
  RPL_WHOISMODES: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    nick: param(),
    text: trailing(),
  }),

  // params: <client> :You are now an IRC operator
  RPL_YOUREOPER: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> <config file> :Rehashing
  RPL_REHASHING: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    configFile: param(),
    text: trailing(),
  }),

  // params: <client> <channel> <modestring> <mode arguments>...
  RPL_CHANNELMODEIS: ({ param, rest }: EnricherCtx) => {
    const client = param()
    const channel = param()
    const modestring = param()
    return { client, channel, modestring, modeArgs: rest() }
  },

  // params: <client> <channel> :<topic>
  RPL_TOPIC: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    channel: param(),
    topic: trailing(),
  }),

  // params: <client> <channel> <nick> <setat>
  RPL_TOPICWHOTIME: ({ param }: EnricherCtx) => ({
    client: param(),
    channel: param(),
    nick: param(),
    setat: param(),
  }),

  // params: <client> <symbol> <channel> :[prefix]<nick>{ [prefix]<nick>}
  RPL_NAMREPLY: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    symbol: param(),
    channel: param(),
    names: trailing(),
  }),

  // params: <client> <channel> :<info>
  RPL_ENDOFNAMES: ({ param }: EnricherCtx) => ({
    client: param(),
    channel: param(),
  }),

  // params: <client> <channel> <mask> [<who> <set-ts>]
  RPL_BANLIST: ({ param, rest }: EnricherCtx) => {
    const client = param()
    const channel = param()
    const mask = param()
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
  RPL_TIME: ({ param, rest }: EnricherCtx) => {
    const client = param()
    const server = param()
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
