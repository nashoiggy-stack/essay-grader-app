# College Majors Enrichment — Validation Report

- Generated: 2026-04-27T02:01:08.428Z
- Run started: 2026-04-27T01:54:58.744Z
- Model: claude-sonnet-4-6
- Schools in cache (this run + prior): 99
- Schools processed THIS run: 99
- Successfully written THIS run: 99

## Summary

| Flag | Count |
| --- | ---: |
| Allowlist drops (topMajors entries not in MAJORS) | 23 entries across 22 schools |
| Missing-curated warnings | 45 schools |
| Breadth-rank mismatches (advisory) | 2 schools |
| Low-confidence rows (`needsReview: true`, excluded from runtime merge) | 0 schools |
| Parse failures | 0 |
| Timeouts | 0 |
| Other errors | 0 |

## Allowlist drops

LLM returned topMajors entries not present in the MAJORS allowlist. These were silently filtered out before writing to the cache.

- **Dartmouth College** — dropped: "Government"
- **Cornell University** — dropped: "Hotel and Hospitality Management", "Industrial Labor Relations"
- **Vanderbilt University** — dropped: "Medicine"
- **University of Notre Dame** — dropped: "Theology"
- **University of Virginia** — dropped: "Commerce"
- **UT Austin** — dropped: "Petroleum Engineering"
- **Penn State University** — dropped: "Meteorology"
- **University of Washington** — dropped: "Medicine"
- **UC Davis** — dropped: "Veterinary Science"
- **UC Irvine** — dropped: "Biological Sciences"
- **Texas A&M University** — dropped: "Veterinary Science"
- **University of Arizona** — dropped: "Optical Sciences"
- **Rutgers University** — dropped: "Pharmacy"
- **University of Connecticut** — dropped: "Pharmacy"
- **University of Rochester** — dropped: "Optics"
- **Pepperdine University** — dropped: "Law"
- **Syracuse University** — dropped: "Information Management"
- **University of South Carolina** — dropped: "Exercise Science"
- **Stevens Institute of Technology** — dropped: "Financial Engineering"
- **University of Oregon** — dropped: "Sports Marketing"
- **Brigham Young University** — dropped: "Law"
- **North Carolina State University** — dropped: "Textile Engineering"

## Missing-curated warnings

These schools have hand-curated topMajors entries that the LLM did NOT return. May indicate either (a) the LLM has a different (possibly better) view of the school's strengths, or (b) it invented a new profile entirely. Spot-check before trusting.

- **University of Pennsylvania** — curated entries absent from LLM: "Biology"
- **Cornell University** — curated entries absent from LLM: "Business"
- **Northwestern University** — curated entries absent from LLM: "Engineering"
- **Rice University** — curated entries absent from LLM: "Biology"
- **Washington University in St. Louis** — curated entries absent from LLM: "Business"
- **Georgetown University** — curated entries absent from LLM: "Business"
- **Carnegie Mellon University** — curated entries absent from LLM: "Business"
- **University of Notre Dame** — curated entries absent from LLM: "Business"
- **NYU** — curated entries absent from LLM: "Communications"
- **Boston College** — curated entries absent from LLM: "Business"
- **Tulane University** — curated entries absent from LLM: "Biology", "Psychology"
- **Case Western Reserve University** — curated entries absent from LLM: "Biology"
- **University of Virginia** — curated entries absent from LLM: "Business"
- **UNC Chapel Hill** — curated entries absent from LLM: "Communications"
- **Georgia Tech** — curated entries absent from LLM: "Business"
- **University of Illinois Urbana-Champaign** — curated entries absent from LLM: "Business"
- **Ohio State University** — curated entries absent from LLM: "Biology"
- **Penn State University** — curated entries absent from LLM: "Biology"
- **University of Washington** — curated entries absent from LLM: "Biology"
- **Purdue University** — curated entries absent from LLM: "Business"
- **Indiana University Bloomington** — curated entries absent from LLM: "Biology", "Communications"
- **UC Davis** — curated entries absent from LLM: "Engineering", "Psychology"
- **UC Santa Barbara** — curated entries absent from LLM: "Communications"
- **UC Irvine** — curated entries absent from LLM: "Biology", "Business"
- **University of Georgia** — curated entries absent from LLM: "Psychology"
- **Clemson University** — curated entries absent from LLM: "Biology"
- **University of Pittsburgh** — curated entries absent from LLM: "Biology"
- **Michigan State University** — curated entries absent from LLM: "Biology"
- **Texas A&M University** — curated entries absent from LLM: "Biology"
- **University of Colorado Boulder** — curated entries absent from LLM: "Psychology"
- **University of Arizona** — curated entries absent from LLM: "Biology", "Psychology"
- **University of Connecticut** — curated entries absent from LLM: "Biology"
- **University of Rochester** — curated entries absent from LLM: "Engineering"
- **Lehigh University** — curated entries absent from LLM: "Biology"
- **Rensselaer Polytechnic Institute** — curated entries absent from LLM: "Information Technology"
- **Syracuse University** — curated entries absent from LLM: "Engineering"
- **University of Iowa** — curated entries absent from LLM: "Engineering"
- **University of South Carolina** — curated entries absent from LLM: "Biology", "Engineering"
- **Stevens Institute of Technology** — curated entries absent from LLM: "Business"
- **Brigham Young University** — curated entries absent from LLM: "Biology"
- **North Carolina State University** — curated entries absent from LLM: "Business"
- **Colorado School of Mines** — curated entries absent from LLM: "Physics"
- **Gonzaga University** — curated entries absent from LLM: "Engineering", "Biology"
- **Binghamton University** — curated entries absent from LLM: "Biology"
- **Auburn University** — curated entries absent from LLM: "Biology"

## Breadth-rank mismatches (advisory)

Schools with US News rank > 100 that returned > 5 topMajors. Advisory only — does NOT set needsReview. Could indicate over-claimed breadth.

- **Arizona State University** (rank 105) — returned 8 topMajors
- **University of Arizona** (rank 105) — returned 7 topMajors

## Low-confidence rows (`needsReview: true`)

_None._

## Parse failures

_None._

## Timeouts

_None._

## Other errors

_None._
