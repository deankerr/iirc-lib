import { EventEmitter } from "node:events";
import { z } from "zod";
//#region src/case-fold-map.ts
var CaseFoldMap = class {
	caseFold;
	valuesByKey = /* @__PURE__ */ new Map();
	constructor(caseFold) {
		this.caseFold = caseFold;
	}
	get size() {
		return this.valuesByKey.size;
	}
	get(key) {
		return this.valuesByKey.get(this.caseFold(key))?.value;
	}
	set(key, value) {
		this.valuesByKey.set(this.caseFold(key), {
			key,
			value
		});
		return this;
	}
	ensure(key, create) {
		const existing = this.get(key);
		if (existing !== void 0) return existing;
		const value = create();
		this.set(key, value);
		return value;
	}
	has(key) {
		return this.valuesByKey.has(this.caseFold(key));
	}
	delete(key) {
		return this.valuesByKey.delete(this.caseFold(key));
	}
	clear() {
		this.valuesByKey.clear();
	}
	*entries() {
		for (const { key, value } of this.valuesByKey.values()) yield [key, value];
	}
	*keys() {
		for (const { key } of this.valuesByKey.values()) yield key;
	}
	*values() {
		for (const { value } of this.valuesByKey.values()) yield value;
	}
	[Symbol.iterator]() {
		return this.entries();
	}
};
//#endregion
//#region src/config.ts
const zStringTrim = z.string().trim().transform((v) => v === "" ? void 0 : v);
const runtimeInputConfigSchema = z.object({
	nick: z.string().trim(),
	password: zStringTrim.optional(),
	realname: zStringTrim.optional(),
	sasl: z.object({
		password: z.string(),
		username: z.string().trim()
	}).optional(),
	sendDelayMs: z.number().optional(),
	user: zStringTrim.optional()
});
const saslSchema = z.object({
	password: z.string().min(1, "sasl.password is required when sasl is configured"),
	username: z.string().min(1, "sasl.username is required when sasl is configured")
});
const runtimeConfigSchema = z.object({
	nick: z.string().min(1, "nick is required and must be non-empty"),
	password: z.string().optional(),
	realname: z.string().min(1, "realname is required and must be non-empty"),
	requestedCapabilities: z.array(z.string()),
	sasl: saslSchema.optional(),
	sendDelayMs: z.number().nonnegative("sendDelayMs must be non-negative"),
	user: z.string().min(1, "user is required and must be non-empty")
});
const DEFAULT_DELAYMS = 1500;
const DEFAULT_CAPABILITIES = ["message-tags"];
function resolveConfig(input) {
	const parsed = runtimeInputConfigSchema.parse(input);
	const { nick } = parsed;
	const user = parsed.user ?? nick;
	const realname = parsed.realname ?? nick;
	const config = {
		nick,
		password: parsed.password,
		realname,
		requestedCapabilities: [...DEFAULT_CAPABILITIES],
		sendDelayMs: parsed.sendDelayMs ?? DEFAULT_DELAYMS,
		user,
		...parsed.sasl ? { sasl: parsed.sasl } : {}
	};
	if (config.sasl && !config.requestedCapabilities.includes("sasl")) config.requestedCapabilities.push("sasl");
	return runtimeConfigSchema.parse(config);
}
//#endregion
//#region src/events/cap.ts
const capEnrichers = {
	CAP: ({ param, optional }) => {
		const client = param();
		const subcommand = param();
		const p2 = optional();
		const p3 = optional();
		const hasContinuation = p2 === "*";
		return {
			client,
			subcommand,
			hasContinuation,
			capsString: hasContinuation ? p3 ?? "" : p2 ?? ""
		};
	},
	AUTHENTICATE: ({ param }) => ({ data: param() })
};
//#endregion
//#region src/events/commands.ts
const commandEnrichers = {
	PRIVMSG: ({ param, trailing }) => ({
		target: param(),
		text: trailing()
	}),
	NOTICE: ({ param, trailing }) => ({
		target: param(),
		text: trailing()
	}),
	TOPIC: ({ param, trailing }) => ({
		channel: param(),
		topic: trailing()
	}),
	PING: ({ trailing }) => ({ token: trailing() }),
	PONG: ({ param, optional }) => ({
		server: param(),
		token: optional()
	}),
	ERROR: ({ trailing }) => ({ reason: trailing() }),
	MODE: ({ param, rest }) => ({
		target: param(),
		modestring: param(),
		modeArgs: rest()
	}),
	KILL: ({ param, trailing }) => ({
		nickname: param(),
		comment: trailing()
	}),
	WALLOPS: ({ trailing }) => ({ message: trailing() }),
	JOIN: ({ param }) => ({ channel: param() }),
	PART: ({ param, optional }) => ({
		channel: param(),
		reason: optional()
	}),
	QUIT: ({ optional }) => ({ reason: optional() }),
	NICK: ({ param }) => ({ newnick: param() }),
	KICK: ({ param, optional }) => ({
		channel: param(),
		user: param(),
		comment: optional()
	}),
	INVITE: ({ param }) => ({
		nickname: param(),
		channel: param()
	})
};
//#endregion
//#region src/events/numerics-000.ts
const numerics000 = {
	RPL_WELCOME: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	RPL_YOURHOST: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	RPL_CREATED: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	RPL_MYINFO: ({ param, optional }) => ({
		client: param(),
		servername: param(),
		version: param(),
		availableUserModes: param(),
		availableChanModes: param(),
		chanModesWithParam: optional()
	}),
	RPL_ISUPPORT: ({ param, rest }) => {
		const client = param();
		const r = rest();
		return {
			client,
			tokens: r.slice(0, -1),
			text: r.at(-1)
		};
	},
	RPL_BOUNCE: ({ param, trailing }) => ({
		client: param(),
		hostname: param(),
		port: param(),
		info: trailing()
	})
};
//#endregion
//#region src/events/numerics-200.ts
const numerics200 = {
	RPL_STATSCOMMANDS: ({ param, rest }) => {
		const client = param();
		const command = param();
		const count = param();
		const r = rest();
		return {
			client,
			command,
			count,
			byteCount: r[0],
			remoteCount: r[1]
		};
	},
	RPL_ENDOFSTATS: ({ param, trailing }) => ({
		client: param(),
		statsLetter: param(),
		text: trailing()
	}),
	RPL_UMODEIS: ({ param }) => ({
		client: param(),
		userModes: param()
	}),
	RPL_STATSUPTIME: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	RPL_LUSERCLIENT: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	RPL_LUSEROP: ({ param, trailing }) => ({
		client: param(),
		ops: param(),
		text: trailing()
	}),
	RPL_LUSERUNKNOWN: ({ param, trailing }) => ({
		client: param(),
		connections: param(),
		text: trailing()
	}),
	RPL_LUSERCHANNELS: ({ param, trailing }) => ({
		client: param(),
		channels: param(),
		text: trailing()
	}),
	RPL_LUSERME: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	RPL_ADMINME: ({ param, rest }) => {
		const client = param();
		const r = rest();
		return {
			client,
			server: r.length > 1 ? r[0] : void 0,
			info: r.at(-1)
		};
	},
	RPL_ADMINLOC1: ({ param, trailing }) => ({
		client: param(),
		info: trailing()
	}),
	RPL_ADMINLOC2: ({ param, trailing }) => ({
		client: param(),
		info: trailing()
	}),
	RPL_ADMINEMAIL: ({ param, trailing }) => ({
		client: param(),
		info: trailing()
	}),
	RPL_TRYAGAIN: ({ param, trailing }) => ({
		client: param(),
		command: param(),
		text: trailing()
	}),
	RPL_LOCALUSERS: ({ param, rest }) => {
		const client = param();
		const r = rest();
		return {
			client,
			u: r.length > 1 ? r[0] : void 0,
			m: r.length > 1 ? r[1] : void 0,
			text: r.at(-1)
		};
	},
	RPL_GLOBALUSERS: ({ param, rest }) => {
		const client = param();
		const r = rest();
		return {
			client,
			u: r.length > 1 ? r[0] : void 0,
			m: r.length > 1 ? r[1] : void 0,
			text: r.at(-1)
		};
	},
	RPL_WHOISCERTFP: ({ param, trailing }) => ({
		client: param(),
		nick: param(),
		text: trailing()
	})
};
//#endregion
//#region src/events/numerics-300.ts
const numerics300 = {
	RPL_AWAY: ({ param, trailing }) => ({
		client: param(),
		nick: param(),
		message: trailing()
	}),
	RPL_USERHOST: ({ param, trailing }) => ({
		client: param(),
		replies: trailing()
	}),
	RPL_UNAWAY: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	RPL_NOWAWAY: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	RPL_WHOISREGNICK: ({ param, trailing }) => ({
		client: param(),
		nick: param(),
		text: trailing()
	}),
	RPL_WHOISUSER: ({ param, trailing }) => ({
		client: param(),
		nick: param(),
		username: param(),
		host: param(),
		realname: trailing()
	}),
	RPL_WHOISSERVER: ({ param, trailing }) => ({
		client: param(),
		nick: param(),
		server: param(),
		serverInfo: trailing()
	}),
	RPL_WHOISOPERATOR: ({ param, trailing }) => ({
		client: param(),
		nick: param(),
		text: trailing()
	}),
	RPL_WHOWASUSER: ({ param, trailing }) => ({
		client: param(),
		nick: param(),
		username: param(),
		host: param(),
		realname: trailing()
	}),
	RPL_ENDOFWHO: ({ param, trailing }) => ({
		client: param(),
		mask: param(),
		text: trailing()
	}),
	RPL_WHOISIDLE: ({ param, trailing }) => ({
		client: param(),
		nick: param(),
		secs: param(),
		signon: param(),
		text: trailing()
	}),
	RPL_ENDOFWHOIS: ({ param, trailing }) => ({
		client: param(),
		nick: param(),
		text: trailing()
	}),
	RPL_WHOISSPECIAL: ({ param, trailing }) => ({
		client: param(),
		nick: param(),
		text: trailing()
	}),
	RPL_WHOISCHANNELS: ({ param, trailing }) => ({
		client: param(),
		nick: param(),
		channels: trailing()
	}),
	RPL_LISTSTART: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	RPL_LIST: ({ param, trailing }) => ({
		client: param(),
		channel: param(),
		clientCount: param(),
		topic: trailing()
	}),
	RPL_LISTEND: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	RPL_CREATIONTIME: ({ param }) => ({
		client: param(),
		channel: param(),
		creationtime: param()
	}),
	RPL_WHOISACCOUNT: ({ param, trailing }) => ({
		client: param(),
		nick: param(),
		account: param(),
		text: trailing()
	}),
	RPL_NOTOPIC: ({ param, trailing }) => ({
		client: param(),
		channel: param(),
		text: trailing()
	}),
	RPL_INVITELIST: ({ param }) => ({
		client: param(),
		channel: param()
	}),
	RPL_ENDOFINVITELIST: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	RPL_WHOISACTUALLY: ({ param, trailing }) => ({
		client: param(),
		nick: param(),
		text: trailing()
	}),
	RPL_INVITING: ({ param }) => ({
		client: param(),
		nick: param(),
		channel: param()
	}),
	RPL_INVEXLIST: ({ param }) => ({
		client: param(),
		channel: param(),
		mask: param()
	}),
	RPL_ENDOFINVEXLIST: ({ param, trailing }) => ({
		client: param(),
		channel: param(),
		text: trailing()
	}),
	RPL_EXCEPTLIST: ({ param }) => ({
		client: param(),
		channel: param(),
		mask: param()
	}),
	RPL_ENDOFEXCEPTLIST: ({ param, trailing }) => ({
		client: param(),
		channel: param(),
		text: trailing()
	}),
	RPL_VERSION: ({ param, trailing }) => ({
		client: param(),
		version: param(),
		server: param(),
		comments: trailing()
	}),
	RPL_WHOREPLY: ({ param, trailing }) => ({
		client: param(),
		channel: param(),
		username: param(),
		host: param(),
		server: param(),
		nick: param(),
		flags: param(),
		text: trailing()
	}),
	RPL_LINKS: ({ param, trailing }) => ({
		client: param(),
		server1: param(),
		server2: param(),
		text: trailing()
	}),
	RPL_ENDOFLINKS: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	RPL_ENDOFWHOWAS: ({ param, trailing }) => ({
		client: param(),
		nick: param(),
		text: trailing()
	}),
	RPL_INFO: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	RPL_MOTD: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	RPL_ENDOFINFO: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	RPL_MOTDSTART: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	RPL_ENDOFMOTD: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	RPL_WHOISHOST: ({ param, trailing }) => ({
		client: param(),
		nick: param(),
		text: trailing()
	}),
	RPL_WHOISMODES: ({ param, trailing }) => ({
		client: param(),
		nick: param(),
		text: trailing()
	}),
	RPL_YOUREOPER: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	RPL_REHASHING: ({ param, trailing }) => ({
		client: param(),
		configFile: param(),
		text: trailing()
	}),
	RPL_CHANNELMODEIS: ({ param, rest }) => {
		return {
			client: param(),
			channel: param(),
			modestring: param(),
			modeArgs: rest()
		};
	},
	RPL_TOPIC: ({ param, trailing }) => ({
		client: param(),
		channel: param(),
		topic: trailing()
	}),
	RPL_TOPICWHOTIME: ({ param }) => ({
		client: param(),
		channel: param(),
		nick: param(),
		setat: param()
	}),
	RPL_NAMREPLY: ({ param, trailing }) => ({
		client: param(),
		symbol: param(),
		channel: param(),
		names: trailing()
	}),
	RPL_ENDOFNAMES: ({ param }) => ({
		client: param(),
		channel: param()
	}),
	RPL_BANLIST: ({ param, rest }) => {
		const client = param();
		const channel = param();
		const mask = param();
		const r = rest();
		return {
			client,
			channel,
			mask,
			who: r[0],
			setTs: r[1]
		};
	},
	RPL_TIME: ({ param, rest }) => {
		const client = param();
		const server = param();
		const r = rest();
		return {
			client,
			server,
			timestamp: r.length > 1 ? r[0] : void 0,
			tsOffset: r.length > 2 ? r[1] : void 0,
			time: r.at(-1)
		};
	}
};
//#endregion
//#region src/events/numerics-400.ts
const numerics400 = {
	ERR_UNKNOWNERROR: ({ param, rest }) => {
		const client = param();
		const command = param();
		const r = rest();
		return {
			client,
			command,
			subcommands: r.slice(0, -1),
			info: r.at(-1)
		};
	},
	ERR_NOSUCHNICK: ({ param, trailing }) => ({
		client: param(),
		nickname: param(),
		text: trailing()
	}),
	ERR_NOSUCHSERVER: ({ param, trailing }) => ({
		client: param(),
		serverName: param(),
		text: trailing()
	}),
	ERR_NOSUCHCHANNEL: ({ param, trailing }) => ({
		client: param(),
		channel: param(),
		text: trailing()
	}),
	ERR_CANNOTSENDTOCHAN: ({ param, trailing }) => ({
		client: param(),
		channel: param(),
		text: trailing()
	}),
	ERR_TOOMANYCHANNELS: ({ param, trailing }) => ({
		client: param(),
		channel: param(),
		text: trailing()
	}),
	ERR_WASNOSUCHNICK: ({ param, trailing }) => ({
		client: param(),
		nickname: param(),
		text: trailing()
	}),
	ERR_NOORIGIN: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	ERR_NORECIPIENT: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	ERR_NOTEXTTOSEND: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	ERR_INPUTTOOLONG: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	ERR_UNKNOWNCOMMAND: ({ param, trailing }) => ({
		client: param(),
		command: param(),
		text: trailing()
	}),
	ERR_NOMOTD: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	ERR_NONICKNAMEGIVEN: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	ERR_ERRONEUSNICKNAME: ({ param, trailing }) => ({
		client: param(),
		nick: param(),
		text: trailing()
	}),
	ERR_NICKNAMEINUSE: ({ param, trailing }) => ({
		client: param(),
		nick: param(),
		text: trailing()
	}),
	ERR_NICKCOLLISION: ({ param, trailing }) => ({
		client: param(),
		nick: param(),
		text: trailing()
	}),
	ERR_USERNOTINCHANNEL: ({ param, trailing }) => ({
		client: param(),
		nick: param(),
		channel: param(),
		text: trailing()
	}),
	ERR_NOTONCHANNEL: ({ param, trailing }) => ({
		client: param(),
		channel: param(),
		text: trailing()
	}),
	ERR_USERONCHANNEL: ({ param, trailing }) => ({
		client: param(),
		nick: param(),
		channel: param(),
		text: trailing()
	}),
	ERR_NOTREGISTERED: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	ERR_NEEDMOREPARAMS: ({ param, trailing }) => ({
		client: param(),
		command: param(),
		text: trailing()
	}),
	ERR_ALREADYREGISTERED: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	ERR_PASSWDMISMATCH: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	ERR_YOUREBANNEDCREEP: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	ERR_CHANNELISFULL: ({ param, trailing }) => ({
		client: param(),
		channel: param(),
		text: trailing()
	}),
	ERR_UNKNOWNMODE: ({ param, trailing }) => ({
		client: param(),
		modechar: param(),
		text: trailing()
	}),
	ERR_INVITEONLYCHAN: ({ param, trailing }) => ({
		client: param(),
		channel: param(),
		text: trailing()
	}),
	ERR_BANNEDFROMCHAN: ({ param, trailing }) => ({
		client: param(),
		channel: param(),
		text: trailing()
	}),
	ERR_BADCHANNELKEY: ({ param, trailing }) => ({
		client: param(),
		channel: param(),
		text: trailing()
	}),
	ERR_BADCHANMASK: ({ param, trailing }) => ({
		client: param(),
		channel: param(),
		text: trailing()
	}),
	ERR_NOPRIVILEGES: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	ERR_CHANOPRIVSNEEDED: ({ param, trailing }) => ({
		client: param(),
		channel: param(),
		text: trailing()
	}),
	ERR_CANTKILLSERVER: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	ERR_NOOPERHOST: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	})
};
//#endregion
//#region src/events/numerics-500.ts
const numerics500 = {
	ERR_UMODEUNKNOWNFLAG: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	ERR_USERSDONTMATCH: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	ERR_HELPNOTFOUND: ({ param, trailing }) => ({
		client: param(),
		subject: param(),
		text: trailing()
	}),
	ERR_INVALIDKEY: ({ param, trailing }) => ({
		client: param(),
		target: param(),
		text: trailing()
	})
};
//#endregion
//#region src/events/numerics-600.ts
const numerics600 = {
	RPL_STARTTLS: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	RPL_WHOISSECURE: ({ param, trailing }) => ({
		client: param(),
		nick: param(),
		text: trailing()
	}),
	ERR_STARTTLS: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	ERR_INVALIDMODEPARAM: ({ param, trailing }) => ({
		client: param(),
		target: param(),
		modeChar: param(),
		parameter: param(),
		description: trailing()
	})
};
//#endregion
//#region src/events/numerics-700.ts
const numerics700 = {
	RPL_HELPSTART: ({ param, trailing }) => ({
		client: param(),
		subject: param(),
		text: trailing()
	}),
	RPL_HELPTXT: ({ param, trailing }) => ({
		client: param(),
		subject: param(),
		text: trailing()
	}),
	RPL_ENDOFHELP: ({ param, trailing }) => ({
		client: param(),
		subject: param(),
		text: trailing()
	}),
	ERR_NOPRIVS: ({ param, trailing }) => ({
		client: param(),
		priv: param(),
		text: trailing()
	})
};
//#endregion
//#region src/events/numerics-900.ts
const numerics900 = {
	RPL_LOGGEDIN: ({ param, rest }) => {
		const client = param();
		const r = rest();
		return {
			client,
			nickUserHost: r[0],
			account: r[1],
			text: r.at(-1)
		};
	},
	RPL_LOGGEDOUT: ({ param, trailing }) => ({
		client: param(),
		nickUserHost: param(),
		text: trailing()
	}),
	ERR_NICKLOCKED: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	RPL_SASLSUCCESS: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	ERR_SASLFAIL: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	ERR_SASLTOOLONG: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	ERR_SASLABORTED: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	ERR_SASLALREADY: ({ param, trailing }) => ({
		client: param(),
		text: trailing()
	}),
	RPL_SASLMECHS: ({ param, trailing }) => ({
		client: param(),
		mechanisms: param(),
		text: trailing()
	})
};
//#endregion
//#region src/events/numerics.ts
const numericEnrichers = {
	...numerics000,
	...numerics200,
	...numerics300,
	...numerics400,
	...numerics500,
	...numerics600,
	...numerics700,
	...numerics900
};
//#endregion
//#region src/events/index.ts
const allEnrichers = {
	...commandEnrichers,
	...numericEnrichers,
	...capEnrichers
};
//#endregion
//#region src/numerics-map.ts
const numericsMap = {
	"001": "RPL_WELCOME",
	"002": "RPL_YOURHOST",
	"003": "RPL_CREATED",
	"004": "RPL_MYINFO",
	"005": "RPL_ISUPPORT",
	"010": "RPL_BOUNCE",
	"212": "RPL_STATSCOMMANDS",
	"219": "RPL_ENDOFSTATS",
	"221": "RPL_UMODEIS",
	"242": "RPL_STATSUPTIME",
	"251": "RPL_LUSERCLIENT",
	"252": "RPL_LUSEROP",
	"253": "RPL_LUSERUNKNOWN",
	"254": "RPL_LUSERCHANNELS",
	"255": "RPL_LUSERME",
	"256": "RPL_ADMINME",
	"257": "RPL_ADMINLOC1",
	"258": "RPL_ADMINLOC2",
	"259": "RPL_ADMINEMAIL",
	"263": "RPL_TRYAGAIN",
	"265": "RPL_LOCALUSERS",
	"266": "RPL_GLOBALUSERS",
	"276": "RPL_WHOISCERTFP",
	"300": "RPL_NONE",
	"301": "RPL_AWAY",
	"302": "RPL_USERHOST",
	"305": "RPL_UNAWAY",
	"306": "RPL_NOWAWAY",
	"307": "RPL_WHOISREGNICK",
	"311": "RPL_WHOISUSER",
	"312": "RPL_WHOISSERVER",
	"313": "RPL_WHOISOPERATOR",
	"314": "RPL_WHOWASUSER",
	"315": "RPL_ENDOFWHO",
	"317": "RPL_WHOISIDLE",
	"318": "RPL_ENDOFWHOIS",
	"319": "RPL_WHOISCHANNELS",
	"320": "RPL_WHOISSPECIAL",
	"321": "RPL_LISTSTART",
	"322": "RPL_LIST",
	"323": "RPL_LISTEND",
	"324": "RPL_CHANNELMODEIS",
	"329": "RPL_CREATIONTIME",
	"330": "RPL_WHOISACCOUNT",
	"331": "RPL_NOTOPIC",
	"332": "RPL_TOPIC",
	"333": "RPL_TOPICWHOTIME",
	"336": "RPL_INVITELIST",
	"337": "RPL_ENDOFINVITELIST",
	"338": "RPL_WHOISACTUALLY",
	"341": "RPL_INVITING",
	"346": "RPL_INVEXLIST",
	"347": "RPL_ENDOFINVEXLIST",
	"348": "RPL_EXCEPTLIST",
	"349": "RPL_ENDOFEXCEPTLIST",
	"351": "RPL_VERSION",
	"352": "RPL_WHOREPLY",
	"353": "RPL_NAMREPLY",
	"364": "RPL_LINKS",
	"365": "RPL_ENDOFLINKS",
	"366": "RPL_ENDOFNAMES",
	"367": "RPL_BANLIST",
	"368": "RPL_ENDOFBANLIST",
	"369": "RPL_ENDOFWHOWAS",
	"371": "RPL_INFO",
	"372": "RPL_MOTD",
	"374": "RPL_ENDOFINFO",
	"375": "RPL_MOTDSTART",
	"376": "RPL_ENDOFMOTD",
	"378": "RPL_WHOISHOST",
	"379": "RPL_WHOISMODES",
	"381": "RPL_YOUREOPER",
	"382": "RPL_REHASHING",
	"391": "RPL_TIME",
	"400": "ERR_UNKNOWNERROR",
	"401": "ERR_NOSUCHNICK",
	"402": "ERR_NOSUCHSERVER",
	"403": "ERR_NOSUCHCHANNEL",
	"404": "ERR_CANNOTSENDTOCHAN",
	"405": "ERR_TOOMANYCHANNELS",
	"406": "ERR_WASNOSUCHNICK",
	"409": "ERR_NOORIGIN",
	"411": "ERR_NORECIPIENT",
	"412": "ERR_NOTEXTTOSEND",
	"417": "ERR_INPUTTOOLONG",
	"421": "ERR_UNKNOWNCOMMAND",
	"422": "ERR_NOMOTD",
	"431": "ERR_NONICKNAMEGIVEN",
	"432": "ERR_ERRONEUSNICKNAME",
	"433": "ERR_NICKNAMEINUSE",
	"436": "ERR_NICKCOLLISION",
	"441": "ERR_USERNOTINCHANNEL",
	"442": "ERR_NOTONCHANNEL",
	"443": "ERR_USERONCHANNEL",
	"451": "ERR_NOTREGISTERED",
	"461": "ERR_NEEDMOREPARAMS",
	"462": "ERR_ALREADYREGISTERED",
	"464": "ERR_PASSWDMISMATCH",
	"465": "ERR_YOUREBANNEDCREEP",
	"471": "ERR_CHANNELISFULL",
	"472": "ERR_UNKNOWNMODE",
	"473": "ERR_INVITEONLYCHAN",
	"474": "ERR_BANNEDFROMCHAN",
	"475": "ERR_BADCHANNELKEY",
	"476": "ERR_BADCHANMASK",
	"481": "ERR_NOPRIVILEGES",
	"482": "ERR_CHANOPRIVSNEEDED",
	"483": "ERR_CANTKILLSERVER",
	"491": "ERR_NOOPERHOST",
	"501": "ERR_UMODEUNKNOWNFLAG",
	"502": "ERR_USERSDONTMATCH",
	"524": "ERR_HELPNOTFOUND",
	"525": "ERR_INVALIDKEY",
	"670": "RPL_STARTTLS",
	"671": "RPL_WHOISSECURE",
	"691": "ERR_STARTTLS",
	"696": "ERR_INVALIDMODEPARAM",
	"704": "RPL_HELPSTART",
	"705": "RPL_HELPTXT",
	"706": "RPL_ENDOFHELP",
	"723": "ERR_NOPRIVS",
	"900": "RPL_LOGGEDIN",
	"901": "RPL_LOGGEDOUT",
	"902": "ERR_NICKLOCKED",
	"903": "RPL_SASLSUCCESS",
	"904": "ERR_SASLFAIL",
	"905": "ERR_SASLTOOLONG",
	"906": "ERR_SASLABORTED",
	"907": "ERR_SASLALREADY",
	"908": "RPL_SASLMECHS"
};
//#endregion
//#region src/events.ts
function makeCtx(params) {
	let i = 0;
	return {
		optional: () => {
			const v = params[i];
			i += 1;
			return v;
		},
		param: () => {
			const v = params[i];
			i += 1;
			if (v === void 0) throw new Error(`irc: required param missing at index ${i - 1}`);
			return v;
		},
		rest: () => {
			const v = params.slice(i);
			i = params.length;
			return v;
		},
		trailing: () => {
			const v = params[i];
			i += 1;
			if (v === void 0) throw new Error(`irc: trailing param missing at index ${i - 1}`);
			return v;
		}
	};
}
function hasNumericName(command) {
	return Object.hasOwn(numericsMap, command);
}
function resolveCommand(command) {
	if (hasNumericName(command)) return numericsMap[command];
	return command;
}
function hasEnricher(command) {
	return Object.hasOwn(allEnrichers, command);
}
function buildEvent(message, from) {
	const command = resolveCommand(message.command);
	if (!hasEnricher(command)) return {
		command: "UNKNOWN",
		from,
		raw: message
	};
	const ctx = makeCtx(message.params);
	return {
		command,
		...allEnrichers[command](ctx),
		from,
		raw: message
	};
}
//#endregion
//#region src/features/channel-tracker.ts
var Channel = class {
	members;
	modes = /* @__PURE__ */ new Map();
	name;
	joined = false;
	topic;
	createdAt;
	constructor(name, caseFold) {
		this.members = new CaseFoldMap(caseFold);
		this.name = name;
	}
	addMode(mode, argument) {
		if (argument === void 0) {
			if (!this.modes.has(mode)) this.modes.set(mode, /* @__PURE__ */ new Set());
			return;
		}
		let args = this.modes.get(mode);
		if (args === void 0) {
			args = /* @__PURE__ */ new Set();
			this.modes.set(mode, args);
		}
		args.add(argument);
	}
	removeMode(mode, argument) {
		if (argument === void 0) {
			this.modes.delete(mode);
			return;
		}
		const args = this.modes.get(mode);
		if (args !== void 0) {
			args.delete(argument);
			if (args.size === 0) this.modes.delete(mode);
		}
	}
	getMemberModes(nick) {
		const result = /* @__PURE__ */ new Set();
		for (const [mode, args] of this.modes) if (args.has(nick)) result.add(mode);
		return result;
	}
	addMember(nick) {
		this.members.ensure(nick, () => ({ nick }));
	}
	removeMember(nick) {
		this.members.delete(nick);
		for (const args of this.modes.values()) args.delete(nick);
	}
	renameMember(previousNick, nick) {
		if (!this.members.has(previousNick)) return;
		this.members.delete(previousNick);
		this.members.set(nick, { nick });
		for (const args of this.modes.values()) if (args.has(previousNick)) {
			args.delete(previousNick);
			args.add(nick);
		}
	}
};
function channelTracker(runtime) {
	const pendingNames = new CaseFoldMap((name) => runtime.caseFold(name));
	const ensureChannel = (name) => runtime.channels.ensure(name, () => new Channel(name, (key) => runtime.caseFold(key)));
	runtime.on("event", (event) => {
		if (event.command === "RPL_NAMREPLY") {
			ensureChannel(event.channel);
			for (const entry of runtime.parseNames(event.names)) pendingNames.ensure(event.channel, () => []).push(entry);
			return;
		}
		if (event.command === "RPL_ENDOFNAMES") {
			const channel = ensureChannel(event.channel);
			const pending = pendingNames.get(event.channel) ?? [];
			channel.members.clear();
			for (const prefixMode of runtime.isupport.prefixModes) channel.modes.delete(prefixMode);
			for (const { nick, mode } of pending) {
				channel.addMember(nick);
				if (mode !== void 0) channel.addMode(mode, nick);
			}
			pendingNames.delete(event.channel);
			return;
		}
		if (event.command === "MODE") {
			if (!runtime.isChannel(event.target)) return;
			const channel = ensureChannel(event.target);
			const [, typeB] = runtime.isupport.chanModeGroups;
			for (const change of runtime.parseModeChanges(event.modestring, event.modeArgs)) if (change.action === "+") channel.addMode(change.mode, change.argument);
			else if (typeB.includes(change.mode)) channel.removeMode(change.mode);
			else channel.removeMode(change.mode, change.argument);
			return;
		}
		if (event.command === "RPL_CHANNELMODEIS") {
			const channel = ensureChannel(event.channel);
			const [, typeB] = runtime.isupport.chanModeGroups;
			for (const change of runtime.parseModeChanges(event.modestring, event.modeArgs)) if (change.action === "+") channel.addMode(change.mode, change.argument);
			else if (typeB.includes(change.mode)) channel.removeMode(change.mode);
			else channel.removeMode(change.mode, change.argument);
			return;
		}
		if (event.command === "JOIN") {
			const channel = ensureChannel(event.channel);
			if (event.from.isSelf) channel.joined = true;
			channel.addMember(event.from.name);
			return;
		}
		if (event.command === "PART") {
			const channel = ensureChannel(event.channel);
			if (event.from.isSelf) channel.joined = false;
			channel.removeMember(event.from.name);
			return;
		}
		if (event.command === "TOPIC") {
			const channel = ensureChannel(event.channel);
			if (event.topic === "") {
				delete channel.topic;
				return;
			}
			channel.topic = {
				...channel.topic,
				setAt: String(Date.now() / 1e3),
				setBy: event.from.name,
				text: event.topic
			};
			return;
		}
		if (event.command === "RPL_NOTOPIC") {
			const channel = ensureChannel(event.channel);
			delete channel.topic;
			return;
		}
		if (event.command === "RPL_TOPIC") {
			const channel = ensureChannel(event.channel);
			channel.topic = {
				...channel.topic,
				text: event.topic
			};
			return;
		}
		if (event.command === "RPL_TOPICWHOTIME") {
			const channel = ensureChannel(event.channel);
			channel.topic = {
				setAt: event.setat,
				setBy: event.nick,
				text: channel.topic?.text ?? ""
			};
			return;
		}
		if (event.command === "RPL_CREATIONTIME") {
			const channel = ensureChannel(event.channel);
			channel.createdAt = event.creationtime;
			return;
		}
		if (event.command === "KICK") {
			const channel = ensureChannel(event.channel);
			channel.removeMember(event.user);
			if (runtime.sameIdentifier(event.user, runtime.connectionState.nick)) channel.joined = false;
			return;
		}
		if (event.command === "QUIT") {
			if (event.from.isSelf) for (const channel of runtime.channels.values()) channel.joined = false;
			for (const channel of runtime.channels.values()) channel.removeMember(event.from.name);
			return;
		}
		if (event.command === "KILL") {
			if (runtime.sameIdentifier(event.nickname, runtime.connectionState.nick)) for (const channel of runtime.channels.values()) channel.joined = false;
			for (const channel of runtime.channels.values()) channel.removeMember(event.nickname);
			return;
		}
		if (event.command === "NICK") for (const channel of runtime.channels.values()) channel.renameMember(event.from.name, event.newnick);
	});
}
//#endregion
//#region src/features/identity.ts
function identity(runtime) {
	runtime.on("event", (event) => {
		if (event.command === "NICK") {
			if (!event.from.isSelf) return;
			runtime.connectionState.nick = event.newnick;
			return;
		}
		if (event.command === "RPL_LOGGEDIN") {
			if (event.account !== void 0) runtime.connectionState.account = event.account;
			return;
		}
		if (event.command === "RPL_LOGGEDOUT") delete runtime.connectionState.account;
	});
}
//#endregion
//#region src/features/isupport.ts
const ISUPPORT_DEFAULTS = {
	CASEMAPPING: "rfc1459",
	CHANMODES: "b,k,l,imnpst",
	CHANTYPES: "#&",
	MODES: "3",
	PREFIX: "(ov)@+"
};
function parsePrefix(value) {
	const match = /^\(([^)]*)\)(.*)$/u.exec(value);
	const modes = match?.[1] ?? "";
	const prefixes = match?.[2] ?? "";
	const prefixToMode = /* @__PURE__ */ new Map();
	for (let index = 0; index < prefixes.length; index += 1) prefixToMode.set(prefixes[index] ?? "", modes[index] ?? "");
	return {
		modes,
		prefixToMode
	};
}
function parseChanModes(value) {
	const groups = value.split(",");
	return [
		groups[0] ?? "",
		groups[1] ?? "",
		groups[2] ?? "",
		groups[3] ?? ""
	];
}
var IsupportMap = class {
	values = /* @__PURE__ */ new Map();
	casemapping = ISUPPORT_DEFAULTS.CASEMAPPING;
	chanmodes = ISUPPORT_DEFAULTS.CHANMODES;
	chantypes = ISUPPORT_DEFAULTS.CHANTYPES;
	modes = ISUPPORT_DEFAULTS.MODES;
	prefix = ISUPPORT_DEFAULTS.PREFIX;
	prefixToModeCached;
	prefixModesCached;
	chanModeGroupsCached;
	constructor() {
		const parsed = parsePrefix(this.prefix);
		this.prefixToModeCached = parsed.prefixToMode;
		this.prefixModesCached = parsed.modes;
		this.chanModeGroupsCached = parseChanModes(this.chanmodes);
	}
	get CASEMAPPING() {
		return this.casemapping;
	}
	get CHANMODES() {
		return this.chanmodes;
	}
	get CHANTYPES() {
		return this.chantypes;
	}
	get MODES() {
		return this.modes;
	}
	get PREFIX() {
		return this.prefix;
	}
	get prefixToMode() {
		return this.prefixToModeCached;
	}
	get prefixModes() {
		return this.prefixModesCached;
	}
	get chanModeGroups() {
		return this.chanModeGroupsCached;
	}
	isChannel(target) {
		return this.chantypes.includes(target[0] ?? "");
	}
	get(key) {
		return this.values.get(key);
	}
	set(key, value) {
		this.values.set(key, value);
		this.recompute(key);
	}
	delete(key) {
		const deleted = this.values.delete(key);
		this.recompute(key);
		return deleted;
	}
	clear() {
		this.values.clear();
		this.recomputeAll();
	}
	recompute(key) {
		const upperKey = key.toUpperCase();
		if (upperKey === "CASEMAPPING") this.casemapping = this.stringOrDefault("CASEMAPPING");
		else if (upperKey === "CHANMODES") {
			this.chanmodes = this.stringOrDefault("CHANMODES");
			this.chanModeGroupsCached = parseChanModes(this.chanmodes);
		} else if (upperKey === "CHANTYPES") this.chantypes = this.stringOrDefault("CHANTYPES");
		else if (upperKey === "MODES") this.modes = this.stringOrDefault("MODES");
		else if (upperKey === "PREFIX") {
			this.prefix = this.stringOrDefault("PREFIX");
			const parsed = parsePrefix(this.prefix);
			this.prefixToModeCached = parsed.prefixToMode;
			this.prefixModesCached = parsed.modes;
		}
	}
	recomputeAll() {
		this.casemapping = this.stringOrDefault("CASEMAPPING");
		this.chanmodes = this.stringOrDefault("CHANMODES");
		this.chantypes = this.stringOrDefault("CHANTYPES");
		this.modes = this.stringOrDefault("MODES");
		this.prefix = this.stringOrDefault("PREFIX");
		const parsed = parsePrefix(this.prefix);
		this.prefixToModeCached = parsed.prefixToMode;
		this.prefixModesCached = parsed.modes;
		this.chanModeGroupsCached = parseChanModes(this.chanmodes);
	}
	stringOrDefault(key) {
		const value = this.values.get(key);
		if (typeof value === "string") return value;
		return ISUPPORT_DEFAULTS[key];
	}
};
function isupport(runtime) {
	const EMPTY_VALUE_DEFAULTS = {
		EXCEPTS: "e",
		INVEX: "I"
	};
	function unescapeIsupportValue(value) {
		let result = "";
		let i = 0;
		while (i < value.length) {
			if (value[i] === "\\" && i + 3 < value.length && value[i + 1] === "x") {
				const hex = value.slice(i + 2, i + 4);
				const code = Number.parseInt(hex, 16);
				if (!Number.isNaN(code)) {
					result += String.fromCodePoint(code);
					i += 4;
					continue;
				}
			}
			result += value[i];
			i += 1;
		}
		return result;
	}
	runtime.on("event", (event) => {
		if (event.command !== "RPL_ISUPPORT") return;
		for (const token of event.tokens) {
			if (token.startsWith("-")) {
				runtime.isupport.delete(token.slice(1).toUpperCase());
				continue;
			}
			const equalsIndex = token.indexOf("=");
			if (equalsIndex === -1) {
				const tokenKey = token.toUpperCase();
				const emptyDefault = EMPTY_VALUE_DEFAULTS[tokenKey];
				runtime.isupport.set(tokenKey, emptyDefault ?? true);
				continue;
			}
			const tokenKey = token.slice(0, equalsIndex).toUpperCase();
			const rawValue = token.slice(equalsIndex + 1);
			runtime.isupport.set(tokenKey, unescapeIsupportValue(rawValue));
		}
	});
}
//#endregion
//#region src/features/ping.ts
function ping(runtime) {
	runtime.on("event", (event) => {
		if (event.command !== "PING") return;
		runtime.send("PONG", event.token);
	});
}
//#endregion
//#region src/features/registration.ts
function encodeSaslPlain(username, password) {
	return btoa(` ${username} ${password}`);
}
function chunkPayload(base64) {
	const CHUNK_SIZE = 400;
	const chunks = [];
	for (let i = 0; i < base64.length; i += CHUNK_SIZE) chunks.push(base64.slice(i, i + CHUNK_SIZE));
	if (chunks.at(-1)?.length === CHUNK_SIZE) chunks.push("+");
	return chunks;
}
function registration(runtime) {
	const { config } = runtime;
	const availableCaps = /* @__PURE__ */ new Set();
	let done = false;
	runtime.on("register", () => {
		runtime.send("CAP", "LS", "302");
		if (config.password !== void 0) runtime.send("PASS", config.password);
		runtime.send("NICK", config.nick);
		runtime.send({
			command: "USER",
			params: [
				config.user,
				"0",
				"*",
				config.realname
			]
		});
	});
	runtime.on("event", (event) => {
		if (event.command === "RPL_WELCOME") {
			runtime.connectionState.nick = event.client;
			if (event.raw.source !== void 0) runtime.connectionState.serverHost = event.raw.source;
			runtime.connectionState.registered = true;
			runtime.emit("registered");
			return;
		}
		if (event.command === "RPL_MYINFO") {
			runtime.connectionState.serverVersion = event.version;
			return;
		}
		if (done) return;
		if (event.command === "CAP") {
			if (event.subcommand === "LS") {
				for (const cap of event.capsString.split(" ").filter(Boolean)) availableCaps.add(cap.split("=")[0] ?? cap);
				if (event.hasContinuation) return;
				const capsToRequest = config.requestedCapabilities.filter((cap) => availableCaps.has(cap));
				if (capsToRequest.length === 0) {
					runtime.send("CAP", "END");
					done = true;
					return;
				}
				runtime.send({
					command: "CAP",
					params: ["REQ", capsToRequest.join(" ")]
				});
				return;
			}
			if (event.subcommand === "ACK") {
				for (const cap of event.capsString.split(" ").filter(Boolean)) if (cap.startsWith("-")) runtime.activeCaps.delete(cap.slice(1));
				else runtime.activeCaps.add(cap);
				if (config.sasl && runtime.activeCaps.has("sasl")) {
					runtime.send("AUTHENTICATE", "PLAIN");
					return;
				}
				runtime.send("CAP", "END");
				done = true;
				return;
			}
			if (event.subcommand === "NAK") {
				runtime.send("CAP", "END");
				done = true;
				return;
			}
			return;
		}
		if (event.command === "AUTHENTICATE" && event.data === "+") {
			if (!config.sasl) return;
			const payload = encodeSaslPlain(config.sasl.username, config.sasl.password);
			for (const chunk of chunkPayload(payload)) runtime.send("AUTHENTICATE", chunk);
			return;
		}
		if (event.command === "RPL_SASLSUCCESS") {
			runtime.send("CAP", "END");
			done = true;
			return;
		}
		if (event.command === "ERR_NICKLOCKED") {
			runtime.emit("error", /* @__PURE__ */ new Error("SASL authentication failed: account locked (902)"));
			done = true;
			return;
		}
		if (event.command === "ERR_SASLFAIL") {
			runtime.emit("error", /* @__PURE__ */ new Error("SASL authentication failed (904)"));
			done = true;
			return;
		}
		if (event.command === "ERR_SASLTOOLONG") {
			runtime.emit("error", /* @__PURE__ */ new Error("SASL authentication failed: message too long (905)"));
			done = true;
			return;
		}
		if (event.command === "RPL_SASLMECHS") {
			runtime.emit("error", /* @__PURE__ */ new Error("SASL PLAIN not supported by server (908)"));
			done = true;
		}
	});
}
//#endregion
//#region src/transport/encode-command.ts
function encodeCommand(command) {
	assertDefinedParams(command);
	return buildLine(command.command, command.params);
}
function buildLine(command, params) {
	let line = command.toUpperCase();
	const lastDefinedIndex = params.length - 1;
	for (const [index, param] of params.entries()) {
		const needsTrailing = index === lastDefinedIndex && (param.length === 0 || param.includes(" ") || param.startsWith(":"));
		line += needsTrailing ? ` :${param}` : ` ${param}`;
	}
	return line;
}
function assertDefinedParams(command) {
	for (const param of command.params) if (param === void 0) throw new Error(`Invalid IRC command "${command.command}": params must not contain undefined`);
}
//#endregion
//#region src/transport/input-buffer.ts
const MAX_LINE_LENGTH = 8703;
var InputBuffer = class {
	buffer = "";
	skipping = false;
	push(chunk) {
		this.buffer += chunk;
		const lines = [];
		let overflowExcerpt;
		let newlineIndex = this.buffer.indexOf("\n");
		while (newlineIndex !== -1) {
			let line = this.buffer.slice(0, newlineIndex);
			this.buffer = this.buffer.slice(newlineIndex + 1);
			if (line.endsWith("\r")) line = line.slice(0, -1);
			if (this.skipping) this.skipping = false;
			else lines.push(line);
			newlineIndex = this.buffer.indexOf("\n");
		}
		if (!this.skipping && this.buffer.length > MAX_LINE_LENGTH) {
			overflowExcerpt = this.buffer.slice(0, 100);
			this.buffer = "";
			this.skipping = true;
		}
		return overflowExcerpt === void 0 ? { lines } : {
			lines,
			overflowExcerpt
		};
	}
	clear() {
		this.buffer = "";
		this.skipping = false;
	}
};
//#endregion
//#region src/transport/output-queue.ts
var OutputQueue = class {
	delayMs;
	writeLine;
	queue = [];
	timer;
	constructor(writeLine, options) {
		this.writeLine = writeLine;
		this.delayMs = options.delayMs;
	}
	enqueue(line) {
		if (this.delayMs <= 0) {
			this.writeLine(line);
			return;
		}
		if (!this.timer) {
			this.writeLine(line);
			this.timer = setTimeout(() => {
				this.drain();
			}, this.delayMs);
			return;
		}
		this.queue.push(line);
	}
	clear() {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = void 0;
		}
		this.queue = [];
	}
	drain() {
		this.timer = void 0;
		const next = this.queue.shift();
		if (next === void 0) return;
		this.writeLine(next);
		this.timer = setTimeout(() => {
			this.drain();
		}, this.delayMs);
	}
};
//#endregion
//#region src/transport/parse-message.ts
function parseMessage(line) {
	let pos = 0;
	let tags = {};
	let source;
	if (line[pos] === "@") {
		const spaceIndex = line.indexOf(" ", pos);
		if (spaceIndex === -1) throw new Error("Malformed IRC message: tags without command");
		tags = parseTags(line.slice(1, spaceIndex));
		pos = spaceIndex + 1;
		while (line[pos] === " ") pos += 1;
	}
	if (line[pos] === ":") {
		const spaceIndex = line.indexOf(" ", pos);
		if (spaceIndex === -1) throw new Error("Malformed IRC message: source without command");
		source = line.slice(pos + 1, spaceIndex);
		pos = spaceIndex + 1;
		while (line[pos] === " ") pos += 1;
	}
	const remainder = line.slice(pos);
	const spaceIndex = remainder.indexOf(" ");
	const command = (spaceIndex === -1 ? remainder : remainder.slice(0, spaceIndex)).toUpperCase();
	const paramsSource = spaceIndex === -1 ? "" : remainder.slice(spaceIndex + 1);
	if (command.length === 0) throw new Error("Malformed IRC message: missing command");
	const message = {
		command,
		params: parseParams(paramsSource),
		tags
	};
	if (source !== void 0) message.source = source;
	return message;
}
function parseParams(serialized) {
	if (serialized.length === 0) return [];
	const params = [];
	let pos = 0;
	while (pos < serialized.length) {
		while (serialized[pos] === " ") pos += 1;
		if (pos >= serialized.length) break;
		if (serialized[pos] === ":") {
			params.push(serialized.slice(pos + 1));
			break;
		}
		const nextSpace = serialized.indexOf(" ", pos);
		if (nextSpace === -1) {
			params.push(serialized.slice(pos));
			break;
		}
		params.push(serialized.slice(pos, nextSpace));
		pos = nextSpace + 1;
	}
	return params;
}
function parseTags(serialized) {
	const tags = {};
	for (const part of serialized.split(";")) {
		if (part.length === 0) continue;
		const equalsIndex = part.indexOf("=");
		if (equalsIndex === -1) {
			tags[part] = "";
			continue;
		}
		const key = part.slice(0, equalsIndex);
		tags[key] = unescapeTagValue(part.slice(equalsIndex + 1));
	}
	return tags;
}
function unescapeTagValue(value) {
	let result = "";
	let index = 0;
	while (index < value.length) {
		const char = value[index];
		if (char !== "\\") {
			result += char;
			index += 1;
			continue;
		}
		const next = value[index + 1];
		if (next === void 0) break;
		switch (next) {
			case ":":
				result += ";";
				break;
			case "s":
				result += " ";
				break;
			case "\\":
				result += "\\";
				break;
			case "r":
				result += "\r";
				break;
			case "n":
				result += "\n";
				break;
			default:
				result += next;
				break;
		}
		index += 2;
	}
	return result;
}
//#endregion
//#region src/transport/transport.ts
var Transport = class extends EventEmitter {
	inputBuffer = new InputBuffer();
	outputQueue;
	stream;
	transportOk = true;
	handleDataRef = (chunk) => {
		this.handleChunk(chunk);
	};
	handleCloseRef = () => {
		this.handleClose();
	};
	handleErrorRef = (error) => {
		this.handleError(error);
	};
	constructor(stream, options) {
		super();
		this.stream = stream;
		this.outputQueue = new OutputQueue((line) => {
			this.writeLine(line);
		}, { delayMs: options.sendDelayMs });
		stream.setEncoding("utf-8");
		stream.on("data", this.handleDataRef);
		stream.on("close", this.handleCloseRef);
		stream.on("error", this.handleErrorRef);
	}
	get ok() {
		return this.transportOk;
	}
	send(command) {
		this.outputQueue.enqueue(encodeCommand(command));
	}
	handleChunk(chunk) {
		const { lines, overflowExcerpt } = this.inputBuffer.push(chunk);
		if (overflowExcerpt !== void 0) this.emit("parse_error", overflowExcerpt, /* @__PURE__ */ new Error("IRC line exceeded maximum length and was discarded"));
		for (const line of lines) {
			if (line.length === 0) continue;
			this.emit("read", line);
			let message;
			try {
				message = parseMessage(line);
			} catch (error) {
				this.emit("parse_error", line, error instanceof Error ? error : new Error(String(error)));
				continue;
			}
			this.emit("message", message);
		}
	}
	writeLine(line) {
		if (!this.transportOk) throw new Error("Transport is no longer ok for writes");
		this.emit("write", line);
		this.stream.write(`${line}\r\n`);
	}
	handleClose() {
		this.finish();
		this.emit("close");
	}
	handleError(error) {
		this.finish();
		this.emit("error", error);
	}
	finish() {
		this.inputBuffer.clear();
		this.outputQueue.clear();
		this.transportOk = false;
	}
};
//#endregion
//#region src/runtime.ts
const defaultRuntimeFeatures = [
	registration,
	ping,
	identity,
	isupport,
	channelTracker
];
var Runtime = class extends EventEmitter {
	config;
	transport;
	connectionState;
	activeCaps = /* @__PURE__ */ new Set();
	isupport = new IsupportMap();
	channels = new CaseFoldMap((name) => this.caseFold(name));
	started = false;
	constructor(config, transport, features = defaultRuntimeFeatures) {
		super();
		this.config = config;
		this.connectionState = {
			nick: config.nick,
			realname: config.realname,
			registered: false,
			user: config.user
		};
		this.transport = transport;
		this.transport.on("message", (message) => {
			let event;
			try {
				event = buildEvent(message, this.parseSource(message.source));
			} catch (error) {
				this.emit("parse_error", message, error instanceof Error ? error : new Error(String(error)));
				return;
			}
			this.emit("event", event);
		});
		this.transport.on("close", () => {
			this.handleClose();
		});
		this.transport.on("error", (error) => {
			this.handleError(error);
		});
		for (const feature of features) feature(this);
	}
	register() {
		if (this.started) throw new Error("Runtime has already been registered");
		this.started = true;
		this.emit("register", this.transport.stream);
	}
	send(commandOrMessage, ...params) {
		if (typeof commandOrMessage === "string") {
			const definedParams = params.filter((param) => param !== void 0);
			this.transport.send({
				command: commandOrMessage,
				params: definedParams
			});
			return;
		}
		this.transport.send(commandOrMessage);
	}
	caseFold(value) {
		const mapping = this.isupport.CASEMAPPING.toLowerCase();
		const asciiFolded = value.toLowerCase();
		switch (mapping) {
			case "rfc1459": return asciiFolded.replaceAll("[", "{").replaceAll("]", "}").replaceAll("\\", "|").replaceAll("~", "^");
			case "rfc1459-strict": return asciiFolded.replaceAll("[", "{").replaceAll("]", "}").replaceAll("\\", "|");
			default: return asciiFolded;
		}
	}
	sameIdentifier(left, right) {
		return this.caseFold(left) === this.caseFold(right);
	}
	isChannel(target) {
		return this.isupport.isChannel(target);
	}
	parseSource(source) {
		if (source === void 0 || source.length === 0) return {
			isSelf: false,
			name: this.connectionState.serverHost ?? ""
		};
		const bangIndex = source.indexOf("!");
		const atIndex = source.indexOf("@");
		let nameEnd = source.length;
		if (bangIndex !== -1) nameEnd = bangIndex;
		else if (atIndex !== -1) nameEnd = atIndex;
		const name = nameEnd > 0 ? source.slice(0, nameEnd) : "(unknown)";
		const userStart = bangIndex === -1 ? -1 : bangIndex + 1;
		const userEnd = atIndex === -1 ? source.length : atIndex;
		const user = userStart === -1 || userEnd <= userStart ? void 0 : source.slice(userStart, userEnd);
		const host = atIndex === -1 ? void 0 : source.slice(atIndex + 1) || void 0;
		return {
			isSelf: this.sameIdentifier(name, this.connectionState.nick),
			name,
			...user !== void 0 && { user },
			...host !== void 0 && { host }
		};
	}
	handleClose() {
		this.emit("close");
	}
	handleError(error) {
		this.emit("error", error);
	}
	parseNames(names) {
		return names.split(" ").filter((name) => name.length > 0).map((name) => {
			const mode = this.isupport.prefixToMode.get(name[0] ?? "");
			if (mode === void 0) return { nick: name };
			return {
				mode,
				nick: name.slice(1)
			};
		});
	}
	parseModeChanges(modes, args) {
		const changes = [];
		let action = "+";
		let argIndex = 0;
		const [typeA, typeB, typeC] = this.isupport.chanModeGroups;
		const { prefixModes } = this.isupport;
		for (const mode of modes) {
			if (mode === "+" || mode === "-") {
				action = mode;
				continue;
			}
			if (prefixModes.includes(mode) || typeA.includes(mode) || typeB.includes(mode)) {
				changes.push({
					action,
					argument: args[argIndex] ?? "",
					mode
				});
				argIndex += 1;
				continue;
			}
			if (typeC.includes(mode)) {
				if (action === "+") {
					changes.push({
						action,
						argument: args[argIndex] ?? "",
						mode
					});
					argIndex += 1;
				} else changes.push({
					action,
					mode
				});
				continue;
			}
			changes.push({
				action,
				mode
			});
		}
		return changes;
	}
};
function createRuntime(input, stream) {
	const config = resolveConfig(input);
	return new Runtime(config, new Transport(stream, { sendDelayMs: config.sendDelayMs }));
}
//#endregion
export { Runtime, createRuntime };
