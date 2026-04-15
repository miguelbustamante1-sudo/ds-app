/**
 * DTO: PersistenceTableColumn
 * Matches the `PersistenceTableColumn` schema in ticads.yaml.
 */
export interface PersistenceTableColumn {
  /** Column ordinal position in the table */
  index: number;
  /** Column name (e.g. 'hol_name') */
  name: string;
  /** Data type alias (e.g. 'integer', 'varchar') */
  type: string;
  /** Maximum length for variable-length types; null when not applicable */
  length: number | null;
  /** Whether the column accepts NULL values */
  allowNull: boolean;
  /** Numeric precision for numeric/decimal types; null when not applicable */
  numericPrecision: number | null;
  /** Numeric scale for numeric/decimal types; null when not applicable */
  numericScale: number | null;
  /** Default value expression or literal; null when not set */
  default: unknown | null;
}

/**
 * DTO: PersistenceTable
 * Matches the `PersistenceTable` schema in ticads.yaml.
 */
export interface PersistenceTable {
  /** Database schema / namespace (e.g. 'ds') */
  schema: string;
  /** Table name (e.g. 'hol_holiday') */
  name: string;
  /** Columns belonging to this table */
  columns: PersistenceTableColumn[];
}
