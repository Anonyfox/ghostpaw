export interface DefaultTrait {
  principle: string;
  provenance: string;
}

export interface DefaultSoul {
  slug: string;
  name: string;
  essence: string;
  description: string;
  traits: DefaultTrait[];
}
