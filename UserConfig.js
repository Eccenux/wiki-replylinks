/**
 * Helper class for gConfig.
 */
// eslint-disable-next-line no-unused-vars
class UserConfig {
	constructor(gConfig) {
		this.gConfig = gConfig;
		/** gConfig key/tag. */
		this.configKey = 'replylinks';
		/** Base info. */
		this.gadgetInfo = {
			name: 'Odpowiedzi z linkami',
			descriptionPage: 'Wikipedia:Narz%C4%99dzia/Odpowiedzi_z_linkami' 
		};
	}

	/** Get user option. */
	get(option) {
		let value = this.gConfig.get(this.configKey, option);
		// bool is mapped to '' or '1'
		if (option.startsWith('bool')) {
			value = value == '1';
		}
		return value;
	}

	/** Register messages. */
	async register() {
		// https://pl.wikipedia.org/wiki/MediaWiki:Gadget-gConfig.js#L-147
		let options = [];
		options.push({
			name: `boolAddSignature`,
			desc: `Dodaj podpis.`,
			type: 'boolean',
			deflt: true,
		});

		// https://pl.wikipedia.org/wiki/MediaWiki:Gadget-gConfig.js#L-147
		this.gConfig.register(this.configKey, this.gadgetInfo, options);
	}
}
