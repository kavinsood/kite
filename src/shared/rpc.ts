import type { RPCSchema } from "electrobun/bun";

export type KiteRPC = {
	bun: RPCSchema<{
		requests: {
			listNotes: {
				params: {};
				response: Array<{
					id: string;
					title: string;
					updatedAt: number;
					preview: string;
				}>;
			};
			getNote: {
				params: { id: string };
				response: { content: string; updatedAt: number } | null;
			};
			saveNote: {
				params: { id: string; content: string };
				response: { updatedAt: number };
			};
			deleteNote: {
				params: { id: string };
				response: void;
			};
			saveDraft: {
				params: { id: string; content: string };
				response: void;
			};
			getDraft: {
				params: { id: string };
				response: string | null;
			};
			deleteDraft: {
				params: { id: string };
				response: void;
			};
			searchNotes: {
				params: { query: string };
				response: Array<{
					id: string;
					title: string;
					updatedAt: number;
					preview: string;
				}>;
			};
		};
		messages: {};
	}>;
	webview: RPCSchema<{
		requests: {};
		messages: {};
	}>;
};
