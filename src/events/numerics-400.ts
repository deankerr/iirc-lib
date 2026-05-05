import type { EnricherCtx } from './types'

export const numerics400 = {
  // params: <client> <command>{ <subcommand>} :<info>
  ERR_UNKNOWNERROR: ({ param, rest }: EnricherCtx) => {
    const client = param()
    const command = param()
    const r = rest()
    return {
      client,
      command,
      subcommands: r.slice(0, -1),
      info: r.at(-1),
    }
  },

  // params: <client> <nickname> :No such nick/channel
  ERR_NOSUCHNICK: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    nickname: param(),
    text: trailing(),
  }),

  // params: <client> <server name> :No such server
  ERR_NOSUCHSERVER: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    serverName: param(),
    text: trailing(),
  }),

  // params: <client> <channel> :No such channel
  ERR_NOSUCHCHANNEL: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    channel: param(),
    text: trailing(),
  }),

  // params: <client> <channel> :Cannot send to channel
  ERR_CANNOTSENDTOCHAN: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    channel: param(),
    text: trailing(),
  }),

  // params: <client> <channel> :You have joined too many channels
  ERR_TOOMANYCHANNELS: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    channel: param(),
    text: trailing(),
  }),

  // params: <client> <nickname> :There was no such nickname
  ERR_WASNOSUCHNICK: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    nickname: param(),
    text: trailing(),
  }),

  // params: <client> :No origin specified
  ERR_NOORIGIN: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> :No recipient given (<command>)
  ERR_NORECIPIENT: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> :No text to send
  ERR_NOTEXTTOSEND: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> :Input line was too long
  ERR_INPUTTOOLONG: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> <command> :Unknown command
  ERR_UNKNOWNCOMMAND: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    command: param(),
    text: trailing(),
  }),

  // params: <client> :MOTD File is missing
  ERR_NOMOTD: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> :No nickname given
  ERR_NONICKNAMEGIVEN: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> <nick> :Erroneus nickname
  ERR_ERRONEUSNICKNAME: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    nick: param(),
    text: trailing(),
  }),

  // params: <client> <nick> :Nickname is already in use
  ERR_NICKNAMEINUSE: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    nick: param(),
    text: trailing(),
  }),

  // params: <client> <nick> :Nickname collision KILL from <user>@<host>
  ERR_NICKCOLLISION: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    nick: param(),
    text: trailing(),
  }),

  // params: <client> <nick> <channel> :They aren't on that channel
  ERR_USERNOTINCHANNEL: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    nick: param(),
    channel: param(),
    text: trailing(),
  }),

  // params: <client> <channel> :You're not on that channel
  ERR_NOTONCHANNEL: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    channel: param(),
    text: trailing(),
  }),

  // params: <client> <nick> <channel> :is already on channel
  ERR_USERONCHANNEL: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    nick: param(),
    channel: param(),
    text: trailing(),
  }),

  // params: <client> :You have not registered
  ERR_NOTREGISTERED: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> <command> :Not enough parameters
  ERR_NEEDMOREPARAMS: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    command: param(),
    text: trailing(),
  }),

  // params: <client> :You may not reregister
  ERR_ALREADYREGISTERED: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> :Password incorrect
  ERR_PASSWDMISMATCH: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> :You are banned from this server.
  ERR_YOUREBANNEDCREEP: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> <channel> :Cannot join channel (+l)
  ERR_CHANNELISFULL: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    channel: param(),
    text: trailing(),
  }),

  // params: <client> <modechar> :is unknown mode char to me
  ERR_UNKNOWNMODE: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    modechar: param(),
    text: trailing(),
  }),

  // params: <client> <channel> :Cannot join channel (+i)
  ERR_INVITEONLYCHAN: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    channel: param(),
    text: trailing(),
  }),

  // params: <client> <channel> :Cannot join channel (+b)
  ERR_BANNEDFROMCHAN: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    channel: param(),
    text: trailing(),
  }),

  // params: <client> <channel> :Cannot join channel (+k)
  ERR_BADCHANNELKEY: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    channel: param(),
    text: trailing(),
  }),

  // params: <client> <channel> :Bad Channel Mask
  ERR_BADCHANMASK: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    channel: param(),
    text: trailing(),
  }),

  // params: <client> :Permission Denied- You're not an IRC operator
  ERR_NOPRIVILEGES: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> <channel> :You're not channel operator
  ERR_CHANOPRIVSNEEDED: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    channel: param(),
    text: trailing(),
  }),

  // params: <client> :You cant kill a server!
  ERR_CANTKILLSERVER: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> :No O-lines for your host
  ERR_NOOPERHOST: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),
}
