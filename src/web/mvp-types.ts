/** Frontend view types retained from local MVP commit 89c72bf. */
export type Category = 'fandom' | 'character' | 'pairing' | 'interest';
export interface Tag { id: string; name: string; category: Category; aliases: string[]; parents: string[] }
export interface Template { id: string; name: string; layout: string; font: string; palette: string }
export interface Catalog { tags: Tag[]; templates: Template[]; fonts: string[]; palettes: string[] }
export interface User { id: string; username: string; handle: string | null }
export interface Look { template: string; layout: string; font: string; palette: string }
export interface Bio {
  id: string; name: string; displayName: string; note: string; tagIds: string[];
  templateId: string; font: string | null; palette: string | null; look: Look; updatedAt: string;
}
export interface Draft {
  id: string | null; name: string; displayName: string; note: string; tagIds: string[];
  templateId: string; font: string | null; palette: string | null;
}
export interface Publication { item: string; listed: boolean }
export interface PublicCard { handle: string; displayName: string; note: string; tagIds: string[]; look: Look; listed: boolean }
