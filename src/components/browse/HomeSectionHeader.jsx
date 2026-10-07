import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function HomeSectionHeader({ title, to }) {
  return (
    <div className="home-section-heading">
      <h2><span aria-hidden="true" />{title}</h2>
      {to && <Link to={to}>View All <ArrowRight className="h-3.5 w-3.5" /></Link>}
    </div>
  );
}