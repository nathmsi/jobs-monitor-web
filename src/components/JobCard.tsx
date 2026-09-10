import type { Job } from "../types";

interface Props {
  job: Job;
}

export function JobCard({ job }: Props) {
  return (
    <article className={`job-card${job.is_new ? " job-card--new" : ""}`}>
      <header className="job-card__head">
        <span className="job-card__id">#{job.external_id}</span>
        <div className="job-card__badges">
          {job.is_new && <span className="badge badge--new">Nouveau</span>}
          {job.is_hot && <span className="badge badge--hot">🔥 Hot</span>}
        </div>
      </header>

      <h3 className="job-card__title" dir="auto">
        {job.title}
      </h3>

      {job.location && (
        <p className="job-card__location" dir="auto">
          📍 {job.location}
        </p>
      )}

      {job.excerpt && (
        <p className="job-card__excerpt" dir="auto">
          {job.excerpt}
        </p>
      )}

      <footer className="job-card__foot">
        {job.last_updated && (
          <span className="job-card__date">{job.last_updated}</span>
        )}
        {job.url && (
          <a
            className="job-card__link"
            href={job.url}
            target="_blank"
            rel="noreferrer"
          >
            Voir l'offre →
          </a>
        )}
      </footer>
    </article>
  );
}
