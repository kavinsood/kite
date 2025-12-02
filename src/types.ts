export interface Note {
  id: string;
  title: string;
  updatedAt: number;
}

export interface FullNote {
  id: string;
  content: string;
  updatedAt: number;
  deleted?: boolean;
}


