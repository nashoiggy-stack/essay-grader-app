"use client";

export default function GPAPage() {
  return (
    <div className="flex-1 w-full">
      <iframe
        src="/gpa-calculator.html"
        className="w-full border-0"
        style={{ height: "calc(100vh - 56px)" }}
        title="GPA Calculator"
      />
    </div>
  );
}
