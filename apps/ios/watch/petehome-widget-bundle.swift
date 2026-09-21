//
//  petehomeBundle.swift
//  petehome
//
//  Created by Pete Brousalis on 1/5/26.
//

import WidgetKit
import SwiftUI

@main
struct PetehomeWidgetBundle: WidgetBundle {
    var body: some Widget {
        PetehomeWidget()
        PetehomeWidgetControl()
    }
}
