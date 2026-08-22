export type OfficialHandoffKind = 'santa_fe_municipal_transit';

export interface OfficialHandoffPresentation {
  kind: OfficialHandoffKind;
  label: string;
  authority: string;
}

interface OfficialHandoffTarget extends OfficialHandoffPresentation {
  url: string;
}

const HANDOFFS: Record<OfficialHandoffKind, OfficialHandoffTarget> = {
  santa_fe_municipal_transit: {
    kind: 'santa_fe_municipal_transit',
    label: 'Consultar transporte oficial',
    authority: 'Municipalidad de Santa Fe',
    url: 'https://santafeciudad.gov.ar/secretaria-de-gobierno-control-movilidad-seguridadciudadana/colectivos/'
  }
};

export function officialHandoffPresentation(kind: OfficialHandoffKind): OfficialHandoffPresentation {
  const target = HANDOFFS[kind];
  if (!target) throw new Error('official_handoff_not_allowlisted');
  return { kind: target.kind, label: target.label, authority: target.authority };
}

export function officialHandoffTarget(kind: OfficialHandoffKind): Readonly<OfficialHandoffTarget> {
  const target = HANDOFFS[kind];
  if (!target) throw new Error('official_handoff_not_allowlisted');
  return target;
}
