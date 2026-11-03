"use client";
import { Modal } from "./ui";
import { ProposalForm } from "./configurator/proposal-form";
import type { Vehicle, VehicleSelection } from "@/types/domain";

export function ProposalModal({ vehicle, selection, onClose }: { vehicle: Vehicle; selection: VehicleSelection; onClose: () => void }) {
  return <Modal open onClose={onClose} title={`Solicitar proposta · ${vehicle.name}`} wide><ProposalForm vehicle={vehicle} selection={selection} /></Modal>;
}
