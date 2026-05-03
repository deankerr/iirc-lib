import type { EnricherCtx } from './types'

export const numerics400 = {
  // params: <client> <command>{ <subcommand>} :<info>
  ERR_UNKNOWNERROR: ({ req, rest }: EnricherCtx) => {
    const client = req()
    const command = req()
    const r = rest()
    return {
      client,
      command,
      subcommands: r.slice(0, -1),
      info: r.at(-1),
    }
  },

  // params: <client> <nickname> :No such nick/channel
  ERR_NOSUCHNICK: ({ req }: EnricherCtx) => ({
    client: req(),
    nickname: req(),
    text: req(),
  }),

  // params: <client> <server name> :No such server
  ERR_NOSUCHSERVER: ({ req }: EnricherCtx) => ({
    client: req(),
    serverName: req(),
    text: req(),
  }),

  // params: <client> <channel> :No such channel
  ERR_NOSUCHCHANNEL: ({ req }: EnricherCtx) => ({
    client: req(),
    channel: req(),
    text: req(),
  }),

  // params: <client> <channel> :Cannot send to channel
  ERR_CANNOTSENDTOCHAN: ({ req }: EnricherCtx) => ({
    client: req(),
    channel: req(),
    text: req(),
  }),

  // params: <client> <channel> :You have joined too many channels
  ERR_TOOMANYCHANNELS: ({ req }: EnricherCtx) => ({
    client: req(),
    channel: req(),
    text: req(),
  }),

  // params: <client> <nickname> :There was no such nickname
  ERR_WASNOSUCHNICK: ({ req }: EnricherCtx) => ({
    client: req(),
    nickname: req(),
    text: req(),
  }),

  // params: <client> :No origin specified
  ERR_NOORIGIN: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> :No recipient given (<command>)
  ERR_NORECIPIENT: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> :No text to send
  ERR_NOTEXTTOSEND: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> :Input line was too long
  ERR_INPUTTOOLONG: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> <command> :Unknown command
  ERR_UNKNOWNCOMMAND: ({ req }: EnricherCtx) => ({
    client: req(),
    command: req(),
    text: req(),
  }),

  // params: <client> :MOTD File is missing
  ERR_NOMOTD: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> :No nickname given
  ERR_NONICKNAMEGIVEN: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> <nick> :Erroneus nickname
  ERR_ERRONEUSNICKNAME: ({ req }: EnricherCtx) => ({
    client: req(),
    nick: req(),
    text: req(),
  }),

  // params: <client> <nick> :Nickname is already in use
  ERR_NICKNAMEINUSE: ({ req }: EnricherCtx) => ({
    client: req(),
    nick: req(),
    text: req(),
  }),

  // params: <client> <nick> :Nickname collision KILL from <user>@<host>
  ERR_NICKCOLLISION: ({ req }: EnricherCtx) => ({
    client: req(),
    nick: req(),
    text: req(),
  }),

  // params: <client> <nick> <channel> :They aren't on that channel
  ERR_USERNOTINCHANNEL: ({ req }: EnricherCtx) => ({
    client: req(),
    nick: req(),
    channel: req(),
    text: req(),
  }),

  // params: <client> <channel> :You're not on that channel
  ERR_NOTONCHANNEL: ({ req }: EnricherCtx) => ({
    client: req(),
    channel: req(),
    text: req(),
  }),

  // params: <client> <nick> <channel> :is already on channel
  ERR_USERONCHANNEL: ({ req }: EnricherCtx) => ({
    client: req(),
    nick: req(),
    channel: req(),
    text: req(),
  }),

  // params: <client> :You have not registered
  ERR_NOTREGISTERED: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> <command> :Not enough parameters
  ERR_NEEDMOREPARAMS: ({ req }: EnricherCtx) => ({
    client: req(),
    command: req(),
    text: req(),
  }),

  // params: <client> :You may not reregister
  ERR_ALREADYREGISTERED: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> :Password incorrect
  ERR_PASSWDMISMATCH: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> :You are banned from this server.
  ERR_YOUREBANNEDCREEP: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> <channel> :Cannot join channel (+l)
  ERR_CHANNELISFULL: ({ req }: EnricherCtx) => ({
    client: req(),
    channel: req(),
    text: req(),
  }),

  // params: <client> <modechar> :is unknown mode char to me
  ERR_UNKNOWNMODE: ({ req }: EnricherCtx) => ({
    client: req(),
    modechar: req(),
    text: req(),
  }),

  // params: <client> <channel> :Cannot join channel (+i)
  ERR_INVITEONLYCHAN: ({ req }: EnricherCtx) => ({
    client: req(),
    channel: req(),
    text: req(),
  }),

  // params: <client> <channel> :Cannot join channel (+b)
  ERR_BANNEDFROMCHAN: ({ req }: EnricherCtx) => ({
    client: req(),
    channel: req(),
    text: req(),
  }),

  // params: <client> <channel> :Cannot join channel (+k)
  ERR_BADCHANNELKEY: ({ req }: EnricherCtx) => ({
    client: req(),
    channel: req(),
    text: req(),
  }),

  // params: <client> <channel> :Bad Channel Mask
  ERR_BADCHANMASK: ({ req }: EnricherCtx) => ({
    client: req(),
    channel: req(),
    text: req(),
  }),

  // params: <client> :Permission Denied- You're not an IRC operator
  ERR_NOPRIVILEGES: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> <channel> :You're not channel operator
  ERR_CHANOPRIVSNEEDED: ({ req }: EnricherCtx) => ({
    client: req(),
    channel: req(),
    text: req(),
  }),

  // params: <client> :You cant kill a server!
  ERR_CANTKILLSERVER: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> :No O-lines for your host
  ERR_NOOPERHOST: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),
}
