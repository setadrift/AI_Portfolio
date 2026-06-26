import {
  HELPER_UPLOAD_TOKEN_PARAM,
  validateHelperUploadToken,
} from "@/lib/portal/alex/helper-upload-access";
import { listTurnRepairProperties } from "@/lib/portal/alex/turn-repairs";
import HelperUploadForm from "./HelperUploadForm";

interface Props {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HelperUploadPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const helperToken = singleValue(params[HELPER_UPLOAD_TOKEN_PARAM]);
  const helperAccess = validateHelperUploadToken(helperToken);
  const properties = (await listTurnRepairProperties().catch(() => [])).filter(
    (property) =>
      !helperAccess?.allowedPropertyIds.length ||
      helperAccess.allowedPropertyIds.includes(property.id),
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-cream-muted">
        Helper upload
      </p>
      <h1 className="mb-3 font-display text-4xl">Submit property photos without Airtable access</h1>
      <p className="mb-8 max-w-3xl text-lg leading-8 text-cream-muted">
        This is the least-privilege version of field capture. A helper can select the property, add
        notes, and upload photos. Everything lands in review before it affects Turn Repairs.
      </p>
      <HelperUploadForm
        properties={properties}
        helperToken={helperAccess ? helperToken : ""}
        helperName={helperAccess?.helperName ?? ""}
      />
    </div>
  );
}

function singleValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
