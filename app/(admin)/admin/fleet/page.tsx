import { redirect } from "next/navigation";

// Fleet was split into Vehicles and Drivers.
export default function FleetAdminPage() {
  redirect("/admin/vehicles");
}
