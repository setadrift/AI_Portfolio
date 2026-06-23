import PublishWizard from "./PublishWizard";

export default function PublishPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="font-display text-4xl mb-2">Publish a blog post</h1>
      <p className="text-cream-muted mb-10">
        Paste a Google Doc link below. We&apos;ll clean it up, generate a featured image, and
        create a WordPress draft for you to review and publish.
      </p>
      <PublishWizard />
    </div>
  );
}
