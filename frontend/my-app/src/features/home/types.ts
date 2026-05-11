export type FeaturePermissions = {
  view: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
  approve?: boolean;
  reject?: boolean;
  assign?: boolean;
  export?: boolean;
  admin?: boolean;
};

export type HomeFeature = {
  feature_key: string;
  title: string;
  description?: string;
  route_path?: string;
  enabled: boolean;
  future: boolean;
  permissions: FeaturePermissions;
  summary: Record<string, string | number | boolean>;
};
