import { EventEmitter } from "node:events";
import { z } from "zod";
import { Duplex } from "node:stream";

//#region src/case-fold-map.d.ts
declare class CaseFoldMap<Value> {
  private readonly caseFold;
  private readonly valuesByKey;
  constructor(caseFold: (key: string) => string);
  get size(): number;
  get(key: string): Value | undefined;
  set(key: string, value: Value): this;
  ensure(key: string, create: () => Value): Value;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
  entries(): IterableIterator<[string, Value]>;
  keys(): IterableIterator<string>;
  values(): IterableIterator<Value>;
  [Symbol.iterator](): IterableIterator<[string, Value]>;
}
//#endregion
//#region src/config.d.ts
declare const runtimeInputConfigSchema: z.ZodObject<{
  nick: z.ZodString;
  password: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string | undefined, string>>>;
  realname: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string | undefined, string>>>;
  sasl: z.ZodOptional<z.ZodObject<{
    password: z.ZodString;
    username: z.ZodString;
  }, z.core.$strip>>;
  sendDelayMs: z.ZodOptional<z.ZodNumber>;
  user: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string | undefined, string>>>;
}, z.core.$strip>;
type RuntimeInputConfig = z.input<typeof runtimeInputConfigSchema>;
declare const runtimeConfigSchema: z.ZodObject<{
  nick: z.ZodString;
  password: z.ZodOptional<z.ZodString>;
  realname: z.ZodString;
  requestedCapabilities: z.ZodArray<z.ZodString>;
  sasl: z.ZodOptional<z.ZodObject<{
    password: z.ZodString;
    username: z.ZodString;
  }, z.core.$strip>>;
  sendDelayMs: z.ZodNumber;
  user: z.ZodString;
}, z.core.$strip>;
type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;
//#endregion
//#region src/events/types.d.ts
interface EnricherCtx {
  param: () => string;
  trailing: () => string;
  optional: () => string | undefined;
  rest: () => string[];
}
//#endregion
//#region src/events/index.d.ts
declare const allEnrichers: {
  CAP: ({
    param,
    optional
  }: EnricherCtx) => {
    client: string;
    subcommand: string;
    hasContinuation: boolean;
    capsString: string;
  };
  AUTHENTICATE: ({
    param
  }: EnricherCtx) => {
    data: string;
  };
  RPL_LOGGEDIN: ({
    param,
    rest
  }: EnricherCtx) => {
    client: string;
    nickUserHost: string | undefined;
    account: string | undefined;
    text: string | undefined;
  };
  RPL_LOGGEDOUT: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    nickUserHost: string;
    text: string;
  };
  ERR_NICKLOCKED: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  RPL_SASLSUCCESS: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  ERR_SASLFAIL: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  ERR_SASLTOOLONG: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  ERR_SASLABORTED: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  ERR_SASLALREADY: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  RPL_SASLMECHS: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    mechanisms: string;
    text: string;
  };
  RPL_HELPSTART: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    subject: string;
    text: string;
  };
  RPL_HELPTXT: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    subject: string;
    text: string;
  };
  RPL_ENDOFHELP: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    subject: string;
    text: string;
  };
  ERR_NOPRIVS: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    priv: string;
    text: string;
  };
  RPL_STARTTLS: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  RPL_WHOISSECURE: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    nick: string;
    text: string;
  };
  ERR_STARTTLS: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  ERR_INVALIDMODEPARAM: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    target: string;
    modeChar: string;
    parameter: string;
    description: string;
  };
  ERR_UMODEUNKNOWNFLAG: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  ERR_USERSDONTMATCH: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  ERR_HELPNOTFOUND: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    subject: string;
    text: string;
  };
  ERR_INVALIDKEY: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    target: string;
    text: string;
  };
  ERR_UNKNOWNERROR: ({
    param,
    rest
  }: EnricherCtx) => {
    client: string;
    command: string;
    subcommands: string[];
    info: string | undefined;
  };
  ERR_NOSUCHNICK: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    nickname: string;
    text: string;
  };
  ERR_NOSUCHSERVER: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    serverName: string;
    text: string;
  };
  ERR_NOSUCHCHANNEL: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    channel: string;
    text: string;
  };
  ERR_CANNOTSENDTOCHAN: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    channel: string;
    text: string;
  };
  ERR_TOOMANYCHANNELS: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    channel: string;
    text: string;
  };
  ERR_WASNOSUCHNICK: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    nickname: string;
    text: string;
  };
  ERR_NOORIGIN: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  ERR_NORECIPIENT: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  ERR_NOTEXTTOSEND: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  ERR_INPUTTOOLONG: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  ERR_UNKNOWNCOMMAND: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    command: string;
    text: string;
  };
  ERR_NOMOTD: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  ERR_NONICKNAMEGIVEN: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  ERR_ERRONEUSNICKNAME: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    nick: string;
    text: string;
  };
  ERR_NICKNAMEINUSE: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    nick: string;
    text: string;
  };
  ERR_NICKCOLLISION: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    nick: string;
    text: string;
  };
  ERR_USERNOTINCHANNEL: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    nick: string;
    channel: string;
    text: string;
  };
  ERR_NOTONCHANNEL: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    channel: string;
    text: string;
  };
  ERR_USERONCHANNEL: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    nick: string;
    channel: string;
    text: string;
  };
  ERR_NOTREGISTERED: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  ERR_NEEDMOREPARAMS: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    command: string;
    text: string;
  };
  ERR_ALREADYREGISTERED: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  ERR_PASSWDMISMATCH: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  ERR_YOUREBANNEDCREEP: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  ERR_CHANNELISFULL: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    channel: string;
    text: string;
  };
  ERR_UNKNOWNMODE: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    modechar: string;
    text: string;
  };
  ERR_INVITEONLYCHAN: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    channel: string;
    text: string;
  };
  ERR_BANNEDFROMCHAN: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    channel: string;
    text: string;
  };
  ERR_BADCHANNELKEY: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    channel: string;
    text: string;
  };
  ERR_BADCHANMASK: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    channel: string;
    text: string;
  };
  ERR_NOPRIVILEGES: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  ERR_CHANOPRIVSNEEDED: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    channel: string;
    text: string;
  };
  ERR_CANTKILLSERVER: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  ERR_NOOPERHOST: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  RPL_AWAY: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    nick: string;
    message: string;
  };
  RPL_USERHOST: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    replies: string;
  };
  RPL_UNAWAY: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  RPL_NOWAWAY: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  RPL_WHOISREGNICK: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    nick: string;
    text: string;
  };
  RPL_WHOISUSER: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    nick: string;
    username: string;
    host: string;
    realname: string;
  };
  RPL_WHOISSERVER: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    nick: string;
    server: string;
    serverInfo: string;
  };
  RPL_WHOISOPERATOR: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    nick: string;
    text: string;
  };
  RPL_WHOWASUSER: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    nick: string;
    username: string;
    host: string;
    realname: string;
  };
  RPL_ENDOFWHO: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    mask: string;
    text: string;
  };
  RPL_WHOISIDLE: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    nick: string;
    secs: string;
    signon: string;
    text: string;
  };
  RPL_ENDOFWHOIS: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    nick: string;
    text: string;
  };
  RPL_WHOISSPECIAL: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    nick: string;
    text: string;
  };
  RPL_WHOISCHANNELS: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    nick: string;
    channels: string;
  };
  RPL_LISTSTART: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  RPL_LIST: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    channel: string;
    clientCount: string;
    topic: string;
  };
  RPL_LISTEND: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  RPL_CREATIONTIME: ({
    param
  }: EnricherCtx) => {
    client: string;
    channel: string;
    creationtime: string;
  };
  RPL_WHOISACCOUNT: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    nick: string;
    account: string;
    text: string;
  };
  RPL_NOTOPIC: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    channel: string;
    text: string;
  };
  RPL_INVITELIST: ({
    param
  }: EnricherCtx) => {
    client: string;
    channel: string;
  };
  RPL_ENDOFINVITELIST: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  RPL_WHOISACTUALLY: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    nick: string;
    text: string;
  };
  RPL_INVITING: ({
    param
  }: EnricherCtx) => {
    client: string;
    nick: string;
    channel: string;
  };
  RPL_INVEXLIST: ({
    param
  }: EnricherCtx) => {
    client: string;
    channel: string;
    mask: string;
  };
  RPL_ENDOFINVEXLIST: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    channel: string;
    text: string;
  };
  RPL_EXCEPTLIST: ({
    param
  }: EnricherCtx) => {
    client: string;
    channel: string;
    mask: string;
  };
  RPL_ENDOFEXCEPTLIST: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    channel: string;
    text: string;
  };
  RPL_VERSION: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    version: string;
    server: string;
    comments: string;
  };
  RPL_WHOREPLY: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    channel: string;
    username: string;
    host: string;
    server: string;
    nick: string;
    flags: string;
    text: string;
  };
  RPL_LINKS: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    server1: string;
    server2: string;
    text: string;
  };
  RPL_ENDOFLINKS: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  RPL_ENDOFWHOWAS: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    nick: string;
    text: string;
  };
  RPL_INFO: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  RPL_MOTD: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  RPL_ENDOFINFO: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  RPL_MOTDSTART: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  RPL_ENDOFMOTD: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  RPL_WHOISHOST: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    nick: string;
    text: string;
  };
  RPL_WHOISMODES: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    nick: string;
    text: string;
  };
  RPL_YOUREOPER: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  RPL_REHASHING: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    configFile: string;
    text: string;
  };
  RPL_CHANNELMODEIS: ({
    param,
    rest
  }: EnricherCtx) => {
    client: string;
    channel: string;
    modestring: string;
    modeArgs: string[];
  };
  RPL_TOPIC: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    channel: string;
    topic: string;
  };
  RPL_TOPICWHOTIME: ({
    param
  }: EnricherCtx) => {
    client: string;
    channel: string;
    nick: string;
    setat: string;
  };
  RPL_NAMREPLY: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    symbol: string;
    channel: string;
    names: string;
  };
  RPL_ENDOFNAMES: ({
    param
  }: EnricherCtx) => {
    client: string;
    channel: string;
  };
  RPL_BANLIST: ({
    param,
    rest
  }: EnricherCtx) => {
    client: string;
    channel: string;
    mask: string;
    who: string | undefined;
    setTs: string | undefined;
  };
  RPL_TIME: ({
    param,
    rest
  }: EnricherCtx) => {
    client: string;
    server: string;
    timestamp: string | undefined;
    tsOffset: string | undefined;
    time: string | undefined;
  };
  RPL_STATSCOMMANDS: ({
    param,
    rest
  }: EnricherCtx) => {
    client: string;
    command: string;
    count: string;
    byteCount: string | undefined;
    remoteCount: string | undefined;
  };
  RPL_ENDOFSTATS: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    statsLetter: string;
    text: string;
  };
  RPL_UMODEIS: ({
    param
  }: EnricherCtx) => {
    client: string;
    userModes: string;
  };
  RPL_STATSUPTIME: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  RPL_LUSERCLIENT: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  RPL_LUSEROP: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    ops: string;
    text: string;
  };
  RPL_LUSERUNKNOWN: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    connections: string;
    text: string;
  };
  RPL_LUSERCHANNELS: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    channels: string;
    text: string;
  };
  RPL_LUSERME: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  RPL_ADMINME: ({
    param,
    rest
  }: EnricherCtx) => {
    client: string;
    server: string | undefined;
    info: string | undefined;
  };
  RPL_ADMINLOC1: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    info: string;
  };
  RPL_ADMINLOC2: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    info: string;
  };
  RPL_ADMINEMAIL: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    info: string;
  };
  RPL_TRYAGAIN: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    command: string;
    text: string;
  };
  RPL_LOCALUSERS: ({
    param,
    rest
  }: EnricherCtx) => {
    client: string;
    u: string | undefined;
    m: string | undefined;
    text: string | undefined;
  };
  RPL_GLOBALUSERS: ({
    param,
    rest
  }: EnricherCtx) => {
    client: string;
    u: string | undefined;
    m: string | undefined;
    text: string | undefined;
  };
  RPL_WHOISCERTFP: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    nick: string;
    text: string;
  };
  RPL_WELCOME: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  RPL_YOURHOST: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  RPL_CREATED: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    text: string;
  };
  RPL_MYINFO: ({
    param,
    optional
  }: EnricherCtx) => {
    client: string;
    servername: string;
    version: string;
    availableUserModes: string;
    availableChanModes: string;
    chanModesWithParam: string | undefined;
  };
  RPL_ISUPPORT: ({
    param,
    rest
  }: EnricherCtx) => {
    client: string;
    tokens: string[];
    text: string | undefined;
  };
  RPL_BOUNCE: ({
    param,
    trailing
  }: EnricherCtx) => {
    client: string;
    hostname: string;
    port: string;
    info: string;
  };
  PRIVMSG: ({
    param,
    trailing
  }: EnricherCtx) => {
    target: string;
    text: string;
  };
  NOTICE: ({
    param,
    trailing
  }: EnricherCtx) => {
    target: string;
    text: string;
  };
  TOPIC: ({
    param,
    trailing
  }: EnricherCtx) => {
    channel: string;
    topic: string;
  };
  PING: ({
    trailing
  }: EnricherCtx) => {
    token: string;
  };
  PONG: ({
    param,
    optional
  }: EnricherCtx) => {
    server: string;
    token: string | undefined;
  };
  ERROR: ({
    trailing
  }: EnricherCtx) => {
    reason: string;
  };
  MODE: ({
    param,
    rest
  }: EnricherCtx) => {
    target: string;
    modestring: string;
    modeArgs: string[];
  };
  KILL: ({
    param,
    trailing
  }: EnricherCtx) => {
    nickname: string;
    comment: string;
  };
  WALLOPS: ({
    trailing
  }: EnricherCtx) => {
    message: string;
  };
  JOIN: ({
    param
  }: EnricherCtx) => {
    channel: string;
  };
  PART: ({
    param,
    optional
  }: EnricherCtx) => {
    channel: string;
    reason: string | undefined;
  };
  QUIT: ({
    optional
  }: EnricherCtx) => {
    reason: string | undefined;
  };
  NICK: ({
    param
  }: EnricherCtx) => {
    newnick: string;
  };
  KICK: ({
    param,
    optional
  }: EnricherCtx) => {
    channel: string;
    user: string;
    comment: string | undefined;
  };
  INVITE: ({
    param
  }: EnricherCtx) => {
    nickname: string;
    channel: string;
  };
};
//#endregion
//#region src/transport/types.d.ts
type IrcTags = Record<string, string>;
interface IrcMessage {
  tags: IrcTags;
  source?: string;
  command: string;
  params: string[];
}
interface IrcCommand {
  command: string;
  params: string[];
}
//#endregion
//#region src/transport/transport.d.ts
interface TransportEvents {
  read: [line: string];
  write: [line: string];
  parse_error: [line: string, error: Error];
  message: [message: IrcMessage];
  close: [];
  error: [error: Error];
}
declare class Transport extends EventEmitter<TransportEvents> {
  private readonly inputBuffer;
  private readonly outputQueue;
  readonly stream: Duplex;
  private transportOk;
  private readonly handleDataRef;
  private readonly handleCloseRef;
  private readonly handleErrorRef;
  constructor(stream: Duplex, options: {
    sendDelayMs: number;
  });
  get ok(): boolean;
  send(command: IrcCommand): void;
  private handleChunk;
  private writeLine;
  private handleClose;
  private handleError;
  private finish;
}
//#endregion
//#region src/events.d.ts
interface EventBase {
  from: ParsedSource;
  raw: IrcMessage;
}
type Simplify<T> = { [K in keyof T]: T[K] } & {};
type BuildEvents<T extends Record<string, (ctx: EnricherCtx) => object>> = { [K in keyof T & string]: Simplify<{
  command: K;
} & ReturnType<T[K]> & EventBase> }[keyof T & string];
type UnknownIrcEvent = Simplify<{
  command: 'UNKNOWN';
} & EventBase>;
type IrcEvent = BuildEvents<typeof allEnrichers> | UnknownIrcEvent;
type IrcEventOf<T extends IrcEvent['command'] = IrcEvent['command']> = Extract<IrcEvent, {
  command: T;
}>;
//#endregion
//#region src/features/channel-tracker.d.ts
interface ChannelTopic {
  text: string;
  setAt?: string;
  setBy?: string;
}
interface ChannelMember {
  nick: string;
}
declare class Channel {
  readonly members: CaseFoldMap<ChannelMember>;
  readonly modes: Map<string, Set<string>>;
  readonly name: string;
  joined: boolean;
  topic?: ChannelTopic;
  createdAt?: string;
  constructor(name: string, caseFold: (key: string) => string);
  addMode(mode: string, argument?: string): void;
  removeMode(mode: string, argument?: string): void;
  getMemberModes(nick: string): Set<string>;
  addMember(nick: string): void;
  removeMember(nick: string): void;
  renameMember(previousNick: string, nick: string): void;
}
//#endregion
//#region src/features/isupport.d.ts
declare class IsupportMap {
  private readonly values;
  private casemapping;
  private chanmodes;
  private chantypes;
  private modes;
  private prefix;
  private prefixToModeCached;
  private prefixModesCached;
  private chanModeGroupsCached;
  constructor();
  get CASEMAPPING(): string;
  get CHANMODES(): string;
  get CHANTYPES(): string;
  get MODES(): string;
  get PREFIX(): string;
  get prefixToMode(): ReadonlyMap<string, string>;
  get prefixModes(): string;
  get chanModeGroups(): [string, string, string, string];
  isChannel(target: string): boolean;
  get(key: string): string | true | undefined;
  set(key: string, value: string | true): void;
  delete(key: string): boolean;
  clear(): void;
  private recompute;
  private recomputeAll;
  private stringOrDefault;
}
//#endregion
//#region src/features/registration.d.ts
declare function registration(runtime: Runtime): void;
//#endregion
//#region src/runtime.d.ts
interface ModeChange {
  action: '+' | '-';
  mode: string;
  argument?: string;
}
interface RuntimeEvents {
  register: [stream: Duplex];
  event: [event: IrcEvent];
  parse_error: [message: IrcMessage, error: Error];
  registered: [];
  close: [];
  error: [Error];
}
interface ConnectionState {
  user: string;
  realname: string;
  registered: boolean;
  nick: string;
  serverHost?: string;
  serverVersion?: string;
  account?: string;
}
interface ParsedSource {
  name: string;
  user?: string;
  host?: string;
  isSelf: boolean;
}
declare class Runtime extends EventEmitter<RuntimeEvents> {
  readonly config: RuntimeConfig;
  readonly transport: Transport;
  readonly connectionState: ConnectionState;
  readonly activeCaps: Set<string>;
  readonly isupport: IsupportMap;
  readonly channels: CaseFoldMap<Channel>;
  private started;
  constructor(config: RuntimeConfig, transport: Transport, features?: (typeof registration)[]);
  register(): void;
  send(command: string, ...params: readonly (string | undefined)[]): void;
  send(command: IrcCommand): void;
  caseFold(value: string): string;
  sameIdentifier(left: string, right: string): boolean;
  isChannel(target: string): boolean;
  parseSource(source: string | undefined): ParsedSource;
  private handleClose;
  private handleError;
  parseNames(names: string): ({
    nick: string;
    mode?: never;
  } | {
    mode: string;
    nick: string;
  })[];
  parseModeChanges(modes: string, args: string[]): ModeChange[];
}
declare function createRuntime(input: RuntimeInputConfig, stream: Duplex): Runtime;
//#endregion
export { ConnectionState, type IrcEvent, type IrcEventOf, ModeChange, ParsedSource, Runtime, RuntimeEvents, type RuntimeInputConfig, type UnknownIrcEvent, createRuntime };